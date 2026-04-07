import type { BOQItem } from '../types';

/**
 * Represents a single AI generation history entry
 */
export interface GenerationHistoryEntry {
    id: string;                    // Unique ID (timestamp-based)
    timestamp: string;             // ISO string of when generated
    prompt: string;                // The description/prompt text
    imageDataUrls: string[];       // Base64 encoded images
    professionalItems: BOQItem[];  // Professional results
    standardizedItems: BOQItem[];  // D&C standardized results
    metadata: {
        apiKeyUsed: boolean;         // Whether custom API key was used
        imageCount: number;          // Number of images used
        itemCounts: {
            professional: number;
            standardized: number;
        };
    };
}

/**
 * Summary for history list display (lighter weight)
 */
export interface GenerationHistorySummary {
    id: string;
    timestamp: string;
    promptPreview: string;         // First 100 chars of prompt
    imageCount: number;
    itemCounts: {
        professional: number;
        standardized: number;
    };
}
