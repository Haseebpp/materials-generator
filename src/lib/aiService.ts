
import { GoogleGenerativeAI } from "@google/generative-ai";
import type { BOQItem } from "@/types";
import { DC_STANDARD_MATERIALS } from "./standardMaterials";

interface ProfessionalGenerationResponse {
    professionalItems: Partial<BOQItem>[];
    rawText?: string;
}

interface StandardizationResponse {
    standardizedItems: Partial<BOQItem>[];
    rawText?: string;
}

// Legacy interface for backwards compatibility
interface AIGenerationResponse {
    professionalItems: Partial<BOQItem>[];
    standardizedItems: Partial<BOQItem>[];
    rawText?: string;
}

// Default Key provided by user
const DEFAULT_API_KEY = "AIzaSyBvr2nxn3kL9ArW9I31HxbEvcCVquGAm1g";

/**
 * Step 1: Generate Professional Materials Only
 * This is the first step in the controlled workflow
 */
export async function generateProfessionalMaterials(
    description: string,
    images: File[],
    userApiKey?: string
): Promise<ProfessionalGenerationResponse> {
    const apiKey = userApiKey || DEFAULT_API_KEY;

    try {
        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: "gemini-flash-latest" });

        const inlineDataParts = await Promise.all(images.map(fileToGenerativePart));

        const professionalPrompt = `
      You are an expert Quantity Surveyor and Material Estimator. 
      Your task is to analyze the provided images and/or description and generate a detailed Bill of Quantities (Material List).
      
      CRITICAL NAMING CONVENTION (Materials Nomenclature Description):
      Follow exactly: [Category] + ':' + [Material/Item/Finish] + [Dimensions/Specifications] + [Unit]
      
      Examples:
      - MDF: MDF 18 mm (1.22×2.44 m )
      - Wood: White wood
      - Acrylics: Acrylic Clear 6 mm (1.22×2.44)
      - Metal: MS Sheet 2 mm (1.22×2.44 m)
      - Metal: MS TUBE 40×40 mm 2 mm Thick 6m
      - Graphics: Sticker
      - Hardware: Screws
      - Hardware: Gun Nails
      - Adhesive: Fevicol
      - Electrical: Led Stips
      - Electrical: TV 85 INCH TCL
      - Paint: PU Paint
      
      Return the output as a valid JSON object with a key "items" containing an array of objects with "description", "qty" (string usually representing number), and "unit" (string). 
      Do NOT include markdown formatting (like \`\`\`json). Just return the raw JSON.
      
      Description: ${description}
    `;

        const professionalResult = await model.generateContent([
            professionalPrompt,
            ...inlineDataParts
        ]);

        const professionalResponse = await professionalResult.response;
        const professionalText = professionalResponse.text();

        console.log("Gemini Professional Response:", professionalText);

        const cleanedProfessionalText = professionalText.replace(/```json/g, '').replace(/```/g, '').trim();
        const professionalContent = JSON.parse(cleanedProfessionalText);
        const professionalItems = Array.isArray(professionalContent) ? professionalContent : (professionalContent.items || []);

        return {
            professionalItems,
            rawText: professionalText
        };

    } catch (error) {
        console.error("AI Professional Generation Error:", error);
        throw error;
    }
}

/**
 * Step 2: Generate D&C Standardized Materials from Professional Items
 * This is called on-demand when user clicks the D&C generate button
 */
export async function generateStandardizedMaterials(
    professionalItems: Partial<BOQItem>[],
    userApiKey?: string
): Promise<StandardizationResponse> {
    const apiKey = userApiKey || DEFAULT_API_KEY;

    if (professionalItems.length === 0) {
        return { standardizedItems: [] };
    }

    try {
        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: "gemini-flash-latest" });

        const standardizationPrompt = `
You are a material naming specialist for D&C Company.
Your task is to SIMPLIFY material names following D&C naming conventions.

CRITICAL RULES:
1. You MUST return EXACTLY ${professionalItems.length} items - one for EACH input material.
2. Do NOT skip, merge, or combine materials. Every input = one output.
3. PRESERVE the EXACT category from the original professional material - do NOT change or generate new categories.
4. Do NOT include units in the description - units are tracked separately in the "unit" field.

${DC_STANDARD_MATERIALS}

Here are the ${professionalItems.length} materials to simplify:
${JSON.stringify(professionalItems, null, 2)}

For EACH material (all ${professionalItems.length} of them):
1. Create a SIMPLIFIED name following D&C naming patterns above (WITHOUT units in description)
2. KEEP the EXACT same category from the original (e.g., if original is "MDF:", keep "MDF")
3. KEEP all size specifications: mm thickness, dimensions like (1.22×2.44 m), voltage, wattage
4. REMOVE only: brand names, location descriptions, purpose descriptions (like "for back wall", "olive oil display")
5. Keep the SAME quantity - do not change it
6. Use standard units in the unit field: Sheets, Pcs, Sqm, Meter, Lot, Box, Kg, Ltr

DESCRIPTION FORMAT - DO NOT include units:
- CORRECT: "MDF 18 mm (1.22×2.44 m)"
- WRONG: "MDF 18 mm (1.22×2.44 m) - Sheets"

WHAT TO KEEP IN DESCRIPTION:
- Material sizes: "18 mm", "10 mm", "6 mm"
- Dimensions: "(1.22×2.44 m)", "(1.22×2.44)"
- Technical specs: "12V", "100W", "3 Pin"
- Color when essential: "Warm White", "Clear", "White"

WHAT TO REMOVE FROM DESCRIPTION:
- Unit suffixes like "- Sheets", "- Pcs", "- Sqm" (put these in "unit" field only)
- Location descriptions: "(Back Wall Scenic 3m x 2.5m)" → just "Backlit Fabric Print"
- Purpose descriptions: "(Olive Oil Bottle Display)" → just "Die-cut Graphic"
- Decorative descriptions: "Persian/Oriental Style" → just "Area Rug"
- Product names: "Olive Tree in White Pot" → "Artificial Plant"

Example transformations (note: category preserved, no unit in description):
- Original: "MDF: MDF 18 mm (1.22×2.44 m)" → category: "MDF", description: "MDF 18 mm (1.22×2.44 m)", unit: "Sheets"
- Original: "Acrylics: Acrylic White 10 mm (3D Logo Afia)" → category: "Acrylics", description: "Acrylic White 10 mm", unit: "Sheets"
- Original: "Electrical: LED Strip Light (Warm White) 12V" → category: "Electrical", description: "LED Strip (Warm White) 12V", unit: "Meter"

Return a JSON object with key "items" containing an array of EXACTLY ${professionalItems.length} objects:
- "category": The EXACT same category from the original professional material
- "description": The simplified D&C style material name (SHORT, NO UNIT SUFFIX!)
- "originalDescription": The original AI-generated name
- "qty": Same quantity as original (MUST match)
- "unit": Standard unit (Sheets, Pcs, Sqm, Meter, Lot, Box, Kg, Ltr)

Do NOT include markdown formatting. Just return raw JSON.
`;

        const standardizedResult = await model.generateContent(standardizationPrompt);
        const standardizedResponse = await standardizedResult.response;
        const standardizedText = standardizedResponse.text();

        console.log("Gemini Standardized Response:", standardizedText);

        const cleanedStandardizedText = standardizedText.replace(/```json/g, '').replace(/```/g, '').trim();
        const standardizedContent = JSON.parse(cleanedStandardizedText);
        const standardizedItems = Array.isArray(standardizedContent) ? standardizedContent : (standardizedContent.items || []);

        return {
            standardizedItems,
            rawText: standardizedText
        };

    } catch (error) {
        console.error("AI Standardization Error:", error);
        throw error;
    }
}

/**
 * Legacy function - generates both in one call
 * @deprecated Use generateProfessionalMaterials and generateStandardizedMaterials separately
 */
export async function generateMaterialList(
    description: string,
    images: File[],
    userApiKey?: string
): Promise<AIGenerationResponse> {
    const professionalResult = await generateProfessionalMaterials(description, images, userApiKey);
    const standardizedResult = await generateStandardizedMaterials(professionalResult.professionalItems, userApiKey);

    return {
        professionalItems: professionalResult.professionalItems,
        standardizedItems: standardizedResult.standardizedItems,
        rawText: professionalResult.rawText
    };
}

async function fileToGenerativePart(file: File): Promise<{ inlineData: { data: string; mimeType: string } }> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => {
            const base64String = (reader.result as string).split(',')[1];
            resolve({
                inlineData: {
                    data: base64String,
                    mimeType: file.type
                }
            });
        };
        reader.onerror = (error) => reject(error);
    });
}

