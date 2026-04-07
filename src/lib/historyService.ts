import type { BOQItem } from '@/types';
import type { GenerationHistoryEntry, GenerationHistorySummary } from '@/types/historyTypes';

const HISTORY_KEY = 'ai_generator_history';
const MAX_HISTORY_ENTRIES = 50; // Limit to prevent localStorage overflow

/**
 * Generate a unique ID for a history entry
 */
function generateId(): string {
    return `gen-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Convert File objects or blob URLs to base64 data URLs
 */
export async function filesToDataUrls(files: File[]): Promise<string[]> {
    const promises = files.map(file => {
        return new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    });
    return Promise.all(promises);
}

/**
 * Save a generation to history
 */
export async function saveGeneration(
    prompt: string,
    files: File[],
    professionalItems: BOQItem[],
    standardizedItems: BOQItem[],
    apiKeyUsed: boolean
): Promise<GenerationHistoryEntry> {
    const imageDataUrls = await filesToDataUrls(files);

    const entry: GenerationHistoryEntry = {
        id: generateId(),
        timestamp: new Date().toISOString(),
        prompt,
        imageDataUrls,
        professionalItems,
        standardizedItems,
        metadata: {
            apiKeyUsed,
            imageCount: files.length,
            itemCounts: {
                professional: professionalItems.length,
                standardized: standardizedItems.length
            }
        }
    };

    const history = getHistory();
    history.unshift(entry); // Add to beginning

    // Limit history size
    if (history.length > MAX_HISTORY_ENTRIES) {
        history.splice(MAX_HISTORY_ENTRIES);
    }

    localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
    return entry;
}

/**
 * Get all history entries
 */
export function getHistory(): GenerationHistoryEntry[] {
    try {
        const data = localStorage.getItem(HISTORY_KEY);
        return data ? JSON.parse(data) : [];
    } catch {
        console.error('Failed to parse history from localStorage');
        return [];
    }
}

/**
 * Get history summaries for display (lighter weight)
 */
export function getHistorySummaries(): GenerationHistorySummary[] {
    const history = getHistory();
    return history.map(entry => ({
        id: entry.id,
        timestamp: entry.timestamp,
        promptPreview: entry.prompt.substring(0, 100) + (entry.prompt.length > 100 ? '...' : ''),
        imageCount: entry.metadata.imageCount,
        itemCounts: entry.metadata.itemCounts
    }));
}

/**
 * Get a single history entry by ID
 */
export function getEntry(id: string): GenerationHistoryEntry | null {
    const history = getHistory();
    return history.find(entry => entry.id === id) || null;
}

/**
 * Delete a history entry
 */
export function deleteEntry(id: string): void {
    const history = getHistory();
    const filtered = history.filter(entry => entry.id !== id);
    localStorage.setItem(HISTORY_KEY, JSON.stringify(filtered));
}

/**
 * Clear all history
 */
export function clearHistory(): void {
    localStorage.removeItem(HISTORY_KEY);
}

/**
 * Export a generation as a downloadable ZIP file
 */
export async function exportGeneration(id: string): Promise<void> {
    const entry = getEntry(id);
    if (!entry) {
        throw new Error('Generation not found');
    }

    // Create JSON content
    const jsonContent = {
        id: entry.id,
        timestamp: entry.timestamp,
        prompt: entry.prompt,
        professionalItems: entry.professionalItems,
        standardizedItems: entry.standardizedItems,
        metadata: entry.metadata
    };

    // For simplicity, we'll create a JSON file download
    // A full ZIP implementation would require a library like JSZip
    const jsonBlob = new Blob([JSON.stringify(jsonContent, null, 2)], { type: 'application/json' });
    const jsonUrl = URL.createObjectURL(jsonBlob);

    const timestamp = new Date(entry.timestamp).toISOString().split('T')[0];
    const promptSlug = entry.prompt.substring(0, 30).replace(/[^a-zA-Z0-9]/g, '_');

    // Download JSON
    const jsonLink = document.createElement('a');
    jsonLink.href = jsonUrl;
    jsonLink.download = `generation_${timestamp}_${promptSlug}.json`;
    document.body.appendChild(jsonLink);
    jsonLink.click();
    document.body.removeChild(jsonLink);
    URL.revokeObjectURL(jsonUrl);

    // Download images separately
    for (let i = 0; i < entry.imageDataUrls.length; i++) {
        const dataUrl = entry.imageDataUrls[i];
        const imageLink = document.createElement('a');
        imageLink.href = dataUrl;

        // Extract extension from data URL
        const mimeMatch = dataUrl.match(/data:image\/(\w+);/);
        const ext = mimeMatch ? mimeMatch[1] : 'png';

        imageLink.download = `generation_${timestamp}_image_${i + 1}.${ext}`;
        document.body.appendChild(imageLink);
        imageLink.click();
        document.body.removeChild(imageLink);
    }
}

/**
 * Convert base64 data URLs back to File objects for restoration
 */
export function dataUrlsToFiles(dataUrls: string[]): File[] {
    return dataUrls.map((dataUrl, index) => {
        // Parse the data URL
        const matches = dataUrl.match(/^data:(.+);base64,(.+)$/);
        if (!matches) {
            throw new Error('Invalid data URL');
        }

        const mimeType = matches[1];
        const base64Data = matches[2];

        // Convert base64 to binary
        const binaryString = atob(base64Data);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i);
        }

        // Create a File object
        const ext = mimeType.split('/')[1] || 'png';
        return new File([bytes], `restored_image_${index + 1}.${ext}`, { type: mimeType });
    });
}
