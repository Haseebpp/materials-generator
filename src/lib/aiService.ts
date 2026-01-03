
import { GoogleGenerativeAI } from "@google/generative-ai";
import type { BOQItem } from "@/types";

interface AIGenerationResponse {
    items: Partial<BOQItem>[];
    rawText?: string;
}

// Default Key provided by user
const DEFAULT_API_KEY = "AIzaSyA6HIWS7VGYAsjThfJioAHx1WZgUlLETsQ";

export async function generateMaterialList(
    description: string,
    images: File[],
    userApiKey?: string
): Promise<AIGenerationResponse> {
    const apiKey = userApiKey || DEFAULT_API_KEY;

    try {
        const genAI = new GoogleGenerativeAI(apiKey);
        // Switching to gemini-flash-latest as 1.5-flash was missing and 2.0-flash has 0 quota
        const model = genAI.getGenerativeModel({ model: "gemini-flash-latest" });

        const inlineDataParts = await Promise.all(images.map(fileToGenerativePart));

        const prompt = `
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
      - Paint: PU Primer
      
      Return the output as a valid JSON object with a key "items" containing an array of objects with "description", "qty" (string usually representing number), and "unit" (string). 
      Do NOT include markdown formatting (like \`\`\`json). Just return the raw JSON.
      
      Description: ${description}
    `;

        const result = await model.generateContent([
            prompt,
            ...inlineDataParts
        ]);

        const response = await result.response;
        const text = response.text();

        console.log("Gemini Response:", text);

        // Clean up potential markdown code blocks if the model ignores the "Do NOT include" instruction
        const cleanedText = text.replace(/```json/g, '').replace(/```/g, '').trim();

        const content = JSON.parse(cleanedText);

        return {
            items: content.items || [],
            rawText: text
        };

    } catch (error) {
        console.error("AI Generation Error:", error);
        throw error;
    }
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
