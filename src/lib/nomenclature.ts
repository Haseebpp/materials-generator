
export function formatMaterialName(
    category: string,
    subTypeOrFinish: string,
    dimensionsOrSpec: string
): string {
    // Pattern: [Category] + [Sub-Type/Finish] + [Dimensions/Specifications] + [Unit]
    // Example: Acrylic Clear 6 mm (1.22×2.44)

    const parts = [
        category,
        subTypeOrFinish,
        dimensionsOrSpec
    ].filter(Boolean).map(s => s.trim());

    return parts.join(" ");
}

export function parseDescription(description: string) {
    // Simple heuristic parser for demo purposes
    // Real implementation would rely on the AI's structured output
    return {
        description
    };
}
