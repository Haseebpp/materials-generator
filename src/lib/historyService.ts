import { supabase, isSupabaseConfigured } from './supabaseClient';
import type { BOQItem } from '@/types';
import type { GenerationHistoryEntry, GenerationHistorySummary } from '@/types/historyTypes';

const HISTORY_KEY = 'ai_generator_history';
const MAX_HISTORY_ENTRIES = 50;

// ─── Helpers ────────────────────────────────────────────────────────────────

function generateId(): string {
    return `gen-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

export async function filesToDataUrls(files: File[]): Promise<string[]> {
    return Promise.all(
        files.map(file =>
            new Promise<string>((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = () => resolve(reader.result as string);
                reader.onerror = reject;
                reader.readAsDataURL(file);
            })
        )
    );
}

export function dataUrlsToFiles(dataUrls: string[]): File[] {
    return dataUrls.map((dataUrl, index) => {
        const matches = dataUrl.match(/^data:(.+);base64,(.+)$/);
        if (!matches) throw new Error('Invalid data URL');
        const mimeType = matches[1];
        const binaryString = atob(matches[2]);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) bytes[i] = binaryString.charCodeAt(i);
        const ext = mimeType.split('/')[1] || 'png';
        return new File([bytes], `restored_image_${index + 1}.${ext}`, { type: mimeType });
    });
}

// ─── Supabase row ↔ app type mappers ────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function rowToEntry(row: any): GenerationHistoryEntry {
    return {
        id: row.id,
        timestamp: typeof row.timestamp === 'string' ? row.timestamp : new Date(row.timestamp).toISOString(),
        prompt: row.prompt,
        imageDataUrls: row.image_data_urls ?? [],
        professionalItems: row.professional_items ?? [],
        standardizedItems: row.standardized_items ?? [],
        metadata: {
            apiKeyUsed: row.api_key_used ?? false,
            imageCount: row.image_count ?? 0,
            itemCounts: {
                professional: row.professional_count ?? 0,
                standardized: row.standardized_count ?? 0,
            },
        },
    };
}

function entryToRow(entry: GenerationHistoryEntry) {
    return {
        id: entry.id,
        timestamp: entry.timestamp,
        prompt: entry.prompt,
        image_data_urls: entry.imageDataUrls,
        professional_items: entry.professionalItems,
        standardized_items: entry.standardizedItems,
        api_key_used: entry.metadata.apiKeyUsed,
        image_count: entry.metadata.imageCount,
        professional_count: entry.metadata.itemCounts.professional,
        standardized_count: entry.metadata.itemCounts.standardized,
    };
}

// ─── localStorage fallbacks ──────────────────────────────────────────────────

function lsGetHistory(): GenerationHistoryEntry[] {
    try {
        const data = localStorage.getItem(HISTORY_KEY);
        return data ? JSON.parse(data) : [];
    } catch {
        return [];
    }
}

function lsSaveHistory(history: GenerationHistoryEntry[]) {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
}

// ─── Public API ──────────────────────────────────────────────────────────────

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
                standardized: standardizedItems.length,
            },
        },
    };

    if (isSupabaseConfigured) {
        const { error } = await supabase
            .from('generation_history')
            .insert(entryToRow(entry));
        if (error) console.error('[historyService] insert error:', error);
    } else {
        // localStorage fallback
        const history = lsGetHistory();
        history.unshift(entry);
        if (history.length > MAX_HISTORY_ENTRIES) history.splice(MAX_HISTORY_ENTRIES);
        lsSaveHistory(history);
    }

    return entry;
}

export async function getHistory(): Promise<GenerationHistoryEntry[]> {
    if (isSupabaseConfigured) {
        const { data, error } = await supabase
            .from('generation_history')
            .select('*')
            .order('timestamp', { ascending: false })
            .limit(MAX_HISTORY_ENTRIES);
        if (error) {
            console.error('[historyService] fetch error:', error);
            return [];
        }
        return (data ?? []).map(rowToEntry);
    }
    return lsGetHistory();
}

export async function getHistorySummaries(): Promise<GenerationHistorySummary[]> {
    if (isSupabaseConfigured) {
        const { data, error } = await supabase
            .from('generation_history')
            .select('id, timestamp, prompt, image_count, professional_count, standardized_count')
            .order('timestamp', { ascending: false })
            .limit(MAX_HISTORY_ENTRIES);
        if (error) {
            console.error('[historyService] summaries error:', error);
            return [];
        }
        return (data ?? []).map(row => ({
            id: row.id,
            timestamp: typeof row.timestamp === 'string' ? row.timestamp : new Date(row.timestamp).toISOString(),
            promptPreview: (row.prompt as string).substring(0, 100) + ((row.prompt as string).length > 100 ? '...' : ''),
            imageCount: row.image_count ?? 0,
            itemCounts: {
                professional: row.professional_count ?? 0,
                standardized: row.standardized_count ?? 0,
            },
        }));
    }
    return lsGetHistory().map(entry => ({
        id: entry.id,
        timestamp: entry.timestamp,
        promptPreview: entry.prompt.substring(0, 100) + (entry.prompt.length > 100 ? '...' : ''),
        imageCount: entry.metadata.imageCount,
        itemCounts: entry.metadata.itemCounts,
    }));
}

export async function getEntry(id: string): Promise<GenerationHistoryEntry | null> {
    if (isSupabaseConfigured) {
        const { data, error } = await supabase
            .from('generation_history')
            .select('*')
            .eq('id', id)
            .maybeSingle();
        if (error) { console.error('[historyService] getEntry error:', error); return null; }
        return data ? rowToEntry(data) : null;
    }
    return lsGetHistory().find(e => e.id === id) ?? null;
}

export async function deleteEntry(id: string): Promise<void> {
    if (isSupabaseConfigured) {
        const { error } = await supabase.from('generation_history').delete().eq('id', id);
        if (error) console.error('[historyService] delete error:', error);
    } else {
        const history = lsGetHistory().filter(e => e.id !== id);
        lsSaveHistory(history);
    }
}

export async function clearHistory(): Promise<void> {
    if (isSupabaseConfigured) {
        const { error } = await supabase.from('generation_history').delete().neq('id', '');
        if (error) console.error('[historyService] clear error:', error);
    } else {
        localStorage.removeItem(HISTORY_KEY);
    }
}

export async function exportGeneration(id: string): Promise<void> {
    const entry = await getEntry(id);
    if (!entry) throw new Error('Generation not found');

    const jsonContent = {
        id: entry.id,
        timestamp: entry.timestamp,
        prompt: entry.prompt,
        professionalItems: entry.professionalItems,
        standardizedItems: entry.standardizedItems,
        metadata: entry.metadata,
    };

    const jsonBlob = new Blob([JSON.stringify(jsonContent, null, 2)], { type: 'application/json' });
    const jsonUrl = URL.createObjectURL(jsonBlob);
    const timestamp = new Date(entry.timestamp).toISOString().split('T')[0];
    const promptSlug = entry.prompt.substring(0, 30).replace(/[^a-zA-Z0-9]/g, '_');

    const jsonLink = document.createElement('a');
    jsonLink.href = jsonUrl;
    jsonLink.download = `generation_${timestamp}_${promptSlug}.json`;
    document.body.appendChild(jsonLink);
    jsonLink.click();
    document.body.removeChild(jsonLink);
    URL.revokeObjectURL(jsonUrl);

    for (let i = 0; i < entry.imageDataUrls.length; i++) {
        const dataUrl = entry.imageDataUrls[i];
        const mimeMatch = dataUrl.match(/data:image\/(\w+);/);
        const ext = mimeMatch ? mimeMatch[1] : 'png';
        const imageLink = document.createElement('a');
        imageLink.href = dataUrl;
        imageLink.download = `generation_${timestamp}_image_${i + 1}.${ext}`;
        document.body.appendChild(imageLink);
        imageLink.click();
        document.body.removeChild(imageLink);
    }
}
