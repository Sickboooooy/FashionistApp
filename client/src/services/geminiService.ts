import { GoogleGenAI, Type } from "@google/genai";
import { AnalysisResult } from "../types";

const getAiClient = () => {
  const apiKey = process.env.API_KEY || '';
  return new GoogleGenAI({ apiKey });
};

// Helper to convert File to Base64
export const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const result = reader.result as string;
      // Remove data:image/jpeg;base64, prefix
      const base64 = result.split(',')[1];
      resolve(base64);
    };
    reader.onerror = (error) => reject(error);
  });
};

export const analyzeGarmentAndStyle = async (base64Image: string, mimeType: string = 'image/jpeg'): Promise<AnalysisResult> => {
  try {
    const ai = getAiClient();
    const modelId = "gemini-2.5-flash"; // Good balance of vision and reasoning
    
    const prompt = `
      You are Anna, a high-end fashion editor and stylist for Vogue. 
      Analyze the uploaded fashion item image.
      
      1. Describe the garment in detail (cut, fabric, vibe).
      2. Identify the category and main colors.
      3. Create 3 distinct outfit suggestions including this item.
         - One Casual Chic
         - One Professional/Elegant
         - One Bold/Avant-Garde
      
      Return the response in strict JSON format matching this schema:
      {
        "garmentDescription": "string",
        "category": "string",
        "colorPalette": ["hex or name"],
        "suggestions": [
          {
            "title": "string (Creative editorial title)",
            "description": "string (Why this works)",
            "occasion": "string",
            "style": "string",
            "items": [
               { "name": "string", "type": "string", "color": "string", "notes": "string" }
            ]
          }
        ]
      }
    `;

    const response = await ai.models.generateContent({
      model: modelId,
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: mimeType,
              data: base64Image
            }
          },
          { text: prompt }
        ]
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            garmentDescription: { type: Type.STRING },
            category: { type: Type.STRING },
            colorPalette: { type: Type.ARRAY, items: { type: Type.STRING } },
            suggestions: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  title: { type: Type.STRING },
                  description: { type: Type.STRING },
                  occasion: { type: Type.STRING },
                  style: { type: Type.STRING },
                  items: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        name: { type: Type.STRING },
                        type: { type: Type.STRING },
                        color: { type: Type.STRING },
                        notes: { type: Type.STRING }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    });

    const text = response.text;
    if (!text) throw new Error("No response from AI");
    
    return JSON.parse(text) as AnalysisResult;

  } catch (error) {
    console.error("Gemini Analysis Error:", error);
    throw error;
  }
};

const SIZE_QUALITY_HINT: Record<string, string> = {
  '1K': 'high resolution',
  '2K': 'ultra high resolution',
  '4K': '4K ultra-detailed',
};

export const generateOutfitVisualization = async (
  prompt: string,
  size: '1K' | '2K' | '4K' = '1K'
): Promise<string> => {
  try {
    const ai = getAiClient();
    const qualityHint = SIZE_QUALITY_HINT[size] ?? 'high resolution';
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [{ text: `${prompt} ${qualityHint} photography.` }]
      },
      config: {
        responseModalities: ['IMAGE'],
      }
    });

    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) {
        return `data:image/png;base64,${part.inlineData.data}`;
      }
    }
    throw new Error("No image generated");
  } catch (error) {
    console.error("Image Gen Error", error);
    throw error;
  }
};

export const generateCreativeDesign = async (
  prompt: string,
  referenceImageBase64?: string,
  mimeType: string = 'image/jpeg',
  aspectRatio: '1:1' | '3:4' | '16:9' = '3:4'
): Promise<string> => {
  try {
    const ai = getAiClient();
    const parts: any[] = [];

    // Prioritize reference image if available for multimodal prompt
    if (referenceImageBase64) {
      parts.push({
        inlineData: {
          mimeType: mimeType,
          data: referenceImageBase64
        }
      });
    }

    // Add text prompt
    parts.push({ 
      text: `Create a high-fashion magazine cover shot. ${prompt}. 
             Style Guidelines: The model should be centered and posed with confidence. 
             Editorial fashion photography, cinematic lighting, detailed fabrics, photorealistic, 8k resolution, Vogue magazine aesthetic.
             Ensure the background is atmospheric but not cluttered, suitable for text overlays.` 
    });

    const response = await ai.models.generateContent({
      model: 'gemini-3.1-flash-image',
      contents: {
        parts: parts
      },
      config: {
        responseModalities: ['IMAGE'],
      }
    });

    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) {
        return `data:image/png;base64,${part.inlineData.data}`;
      }
    }
    throw new Error("No creative design generated");
  } catch (error) {
    console.error("Creative Design Error", error);
    throw error;
  }
};

export const editImageWithGemini = async (
  base64Image: string,
  prompt: string,
  mimeType: string = 'image/jpeg'
): Promise<string> => {
  try {
    const ai = getAiClient();
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: mimeType,
              data: base64Image
            }
          },
          { text: prompt }
        ]
      },
      config: {
        responseModalities: ['IMAGE'],
      }
    });

    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) {
        return `data:image/png;base64,${part.inlineData.data}`;
      }
    }
    throw new Error("No edited image generated");
  } catch (error) {
    console.error("Image Edit Error", error);
    throw error;
  }
};