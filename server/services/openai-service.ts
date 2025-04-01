import OpenAI from "openai";
import { Garment } from "@shared/schema";

// the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
const MODEL = "gpt-4o";
const VISION_MODEL = "gpt-4o";

interface OutfitGenerationRequest {
  garments?: Garment[];
  preferences?: {
    styles?: string[];
    occasions?: { name: string; priority: number }[];
    seasons?: string[];
  };
  textPrompt?: string;
  season?: string;
  occasion?: string;
}

interface OutfitSuggestion {
  name: string;
  description: string;
  occasion: string;
  season: string;
  pieces: string[];
  reasoning: string;
}

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function generateOutfitSuggestions(request: OutfitGenerationRequest): Promise<OutfitSuggestion[]> {
  console.log("Generando outfits con OpenAI...");
  try {
    const { garments, preferences, textPrompt, season, occasion } = request;
    
    // Construir el contexto para el prompt
    let context = "Usa toda la información disponible para crear outfits personalizados.";
    
    if (garments && garments.length > 0) {
      context += `\n\nPrendas disponibles: ${JSON.stringify(garments, null, 2)}`;
    }
    
    if (preferences) {
      context += `\n\nPreferencias de estilo: ${JSON.stringify(preferences, null, 2)}`;
    }
    
    if (textPrompt) {
      context += `\n\nInstrucciones específicas: ${textPrompt}`;
    }
    
    if (season) {
      context += `\n\nTemporada a considerar: ${season}`;
    }
    
    if (occasion) {
      context += `\n\nOcasión para el outfit: ${occasion}`;
    }
    
    const response = await openai.chat.completions.create({
      model: MODEL,
      messages: [
        {
          role: "system",
          content: "Eres un estilista de moda experto que crea outfits personalizados. Respondes con JSON estructurado para facilitar la integración."
        },
        {
          role: "user",
          content: `Genera 3 outfits completos basados en la siguiente información:\n\n${context}\n\nDevuelve un objeto JSON con la propiedad 'outfits' que contenga un array de objetos, donde cada objeto contiene:\n- name: nombre creativo del outfit\n- description: descripción detallada\n- occasion: ocasión adecuada\n- season: temporada ideal\n- pieces: array con todas las prendas y accesorios\n- reasoning: explicación de por qué este outfit funciona\n\nFormato esperado: { "outfits": [...] }`
        }
      ],
      response_format: { type: "json_object" }
    });
    
    // Parsear la respuesta y extraer los outfits
    const content = response.choices[0].message.content ?? "{}";
    const result = JSON.parse(content);
    return result.outfits || [];
  } catch (error) {
    console.error("Error generando outfits:", error instanceof Error ? error.message : String(error));
    throw new Error(`Error generando outfits: ${error instanceof Error ? error.message : 'Error desconocido'}`);
  }
}

interface GarmentAnalysis {
  type: string;
  color: string;
  style?: string;
  material?: string;
  occasions?: string[];
  season?: string;
  pattern?: string;
}

export async function analyzeGarmentImage(base64Image: string): Promise<Partial<Garment>> {
  console.log("Analizando imagen de prenda con OpenAI Vision...");
  try {
    const response = await openai.chat.completions.create({
      model: VISION_MODEL,
      messages: [
        {
          role: "system",
          content: "Eres un experto en moda que analiza prendas de vestir con gran precisión."
        },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: "Analiza esta prenda de ropa y proporciona los siguientes datos en formato JSON: type (tipo de prenda), color (color principal), pattern (patrón o estampado si existe), season (temporada adecuada). Responde SOLO con el JSON, sin explicaciones adicionales."
            },
            {
              type: "image_url",
              image_url: {
                url: `data:image/jpeg;base64,${base64Image}`
              }
            }
          ]
        }
      ],
      max_tokens: 800,
      response_format: { type: "json_object" }
    });
    
    // Extraer el contenido de la respuesta 
    const content = response.choices[0].message.content || "{}";
    
    try {
      // Al usar response_format: { type: "json_object" } el contenido ya viene en formato JSON
      const jsonData = JSON.parse(content) as GarmentAnalysis;
      
      // Convertir a estructura Garment
      return {
        type: jsonData.type || "Unknown",
        color: jsonData.color || undefined,
        pattern: jsonData.pattern || undefined,
        season: jsonData.season || undefined,
        name: jsonData.type || "Prenda",  // Requerido por el esquema
      };
    } catch (parseError) {
      console.error("Error parseando respuesta:", parseError);
      return {
        type: "Unknown",
        color: undefined,
        pattern: undefined,
        season: undefined,
        name: "Prenda",
      };
    }
  } catch (error) {
    console.error("Error en análisis de imagen:", error instanceof Error ? error.message : String(error));
    return {
      type: "Unknown",
      color: undefined,
      pattern: undefined,
      season: undefined,
      name: "Prenda",
    };
  }
}

export async function generateOutfitsFromImage(base64Image: string, preferences?: {
  styles?: string[];
  occasions?: { name: string; priority: number }[];
  seasons?: string[];
}): Promise<OutfitSuggestion[]> {
  try {
    // Primero analizamos la imagen para obtener información de la prenda
    const garmentData = await analyzeGarmentImage(base64Image);
    
    // Para evitar errores al pasar datos incompletos de Garment, creamos un objeto simplificado
    // con la información relevante para la generación de outfits
    const garmentInfo = {
      type: garmentData.type || "Prenda",
      name: garmentData.name || "Prenda",
      color: garmentData.color || "Sin especificar",
      pattern: garmentData.pattern || "Sin patrón",
      season: garmentData.season || "Todas las temporadas"
    };
    
    // Luego generamos outfits basados en la prenda analizada
    const outfitRequest: OutfitGenerationRequest = {
      garments: [garmentInfo as any], // Usar 'any' aquí para evitar problemas con la estructura completa de Garment
      preferences
    };
    
    return await generateOutfitSuggestions(outfitRequest);
  } catch (error) {
    console.error("Error en el proceso de generación de outfits:", error instanceof Error ? error.message : String(error));
    throw new Error(`Error generando outfits: ${error instanceof Error ? error.message : 'Error desconocido'}`);
  }
}