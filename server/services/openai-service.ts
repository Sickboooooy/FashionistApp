import OpenAI from "openai";
import crypto from "crypto";
import { Garment } from "@shared/schema";
import { cacheService } from "./cacheService";

// Inicializar el cliente de OpenAI con la API key del .env
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Interfaz para la solicitud de generación de outfits
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

// Interfaz para la respuesta de sugerencia de outfit
interface OutfitSuggestion {
  name: string;
  description: string;
  occasion: string;
  season: string;
  pieces: string[];
  reasoning: string;
}

/**
 * Genera sugerencias de outfit basadas en prendas y preferencias
 */
export async function generateOutfitSuggestions(request: OutfitGenerationRequest): Promise<OutfitSuggestion[]> {
  try {
    // Generar hash para caché
    let preferenceHash: string | undefined;
    if (request.preferences) {
      const prefStr = JSON.stringify(request.preferences);
      preferenceHash = crypto.createHash('md5').update(prefStr).digest('hex');
    }
    
    let garmentHash: string | undefined;
    if (request.garments && request.garments.length > 0) {
      const garmentStr = JSON.stringify(request.garments);
      garmentHash = crypto.createHash('md5').update(garmentStr).digest('hex');
    }
    
    // Clave para caché
    const cacheKey = cacheService.getOutfitsKey({
      imageHash: garmentHash,
      textPrompt: request.textPrompt,
      preferenceHash,
      season: request.season,
      occasion: request.occasion
    });
    
    // Revisar caché
    const cachedOutfits = cacheService.get<OutfitSuggestion[]>(cacheKey);
    if (cachedOutfits) {
      console.log('Usando sugerencias de outfits de la caché');
      return cachedOutfits;
    }
    
    // Construir el prompt para OpenAI
    let prompt = "Genera 3 sugerencias de outfits de moda basados en la siguiente información:\n\n";
    
    // Añadir información de prendas si existen
    if (request.garments && request.garments.length > 0) {
      prompt += "Prendas disponibles:\n";
      request.garments.forEach((garment, index) => {
        prompt += `${index + 1}. ${garment.name} - ${garment.type} - ${garment.color}${garment.material ? ` - ${garment.material}` : ''}${garment.pattern ? ` - ${garment.pattern}` : ''}\n`;
      });
      prompt += "\n";
    }
    
    // Añadir información de preferencias si existen
    if (request.preferences) {
      if (request.preferences.styles && request.preferences.styles.length > 0) {
        prompt += `Estilos preferidos: ${request.preferences.styles.join(", ")}\n`;
      }
      
      if (request.preferences.occasions && request.preferences.occasions.length > 0) {
        const sortedOccasions = [...request.preferences.occasions]
          .sort((a, b) => b.priority - a.priority)
          .map(o => o.name);
        prompt += `Ocasiones prioritarias: ${sortedOccasions.join(", ")}\n`;
      }
      
      if (request.preferences.seasons && request.preferences.seasons.length > 0) {
        prompt += `Temporadas favoritas: ${request.preferences.seasons.join(", ")}\n`;
      }
      
      prompt += "\n";
    }
    
    // Añadir información específica de temporada u ocasión
    if (request.season) {
      prompt += `Temporada objetivo: ${request.season}\n`;
    }
    
    if (request.occasion) {
      prompt += `Ocasión objetivo: ${request.occasion}\n`;
    }
    
    // Añadir prompt de texto si existe
    if (request.textPrompt) {
      prompt += `Instrucciones adicionales: ${request.textPrompt}\n`;
    }
    
    prompt += "\nPara cada outfit, proporciona los siguientes detalles en formato JSON:\n";
    prompt += "1. name: nombre creativo del outfit\n";
    prompt += "2. description: descripción detallada del outfit\n";
    prompt += "3. occasion: ocasión para la que es adecuado\n";
    prompt += "4. season: temporada recomendada\n";
    prompt += "5. pieces: array de piezas que componen el outfit\n";
    prompt += "6. reasoning: explicación de por qué este outfit funciona\n";
    
    // Llamar a OpenAI
    // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: "Eres un estilista de moda experto. Genera outfit completos detallados y creativos en español, adaptados a las preferencias, ocasiones y temporadas solicitadas."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.7,
      response_format: { type: "json_object" }
    });
    
    // Procesar la respuesta
    const content = response.choices[0].message.content;
    if (!content) {
      throw new Error("No se recibió respuesta del modelo");
    }
    
    // Parsear la respuesta JSON
    try {
      const parsedResponse = JSON.parse(content);
      let outfits: OutfitSuggestion[];
      
      // Verificar el formato de la respuesta
      if (Array.isArray(parsedResponse)) {
        outfits = parsedResponse;
      } else if (parsedResponse.outfits && Array.isArray(parsedResponse.outfits)) {
        outfits = parsedResponse.outfits;
      } else if (parsedResponse.suggestions && Array.isArray(parsedResponse.suggestions)) {
        outfits = parsedResponse.suggestions;
      } else {
        // Intentar extraer los outfits de las propiedades del objeto
        const extractedOutfits = [];
        for (const key in parsedResponse) {
          if (typeof parsedResponse[key] === 'object' && parsedResponse[key] !== null) {
            const outfit = parsedResponse[key];
            if (outfit.name && outfit.description) {
              extractedOutfits.push(outfit);
            }
          }
        }
        
        if (extractedOutfits.length > 0) {
          outfits = extractedOutfits;
        } else {
          throw new Error("Formato de respuesta no reconocido");
        }
      }
      
      // Guardar en caché
      cacheService.set(cacheKey, outfits);
      
      return outfits;
    } catch (error) {
      console.error("Error parsing OpenAI response:", error);
      console.error("Raw response:", content);
      throw new Error("Error procesando la respuesta del modelo");
    }
  } catch (error) {
    console.error("Error generating outfit suggestions:", error);
    throw error;
  }
}

// Interfaz para análisis de prendas
interface GarmentAnalysis {
  type: string;
  color: string;
  style?: string;
  material?: string;
  occasions?: string[];
  season?: string;
  pattern?: string;
}

/**
 * Analiza una imagen de prenda para extraer características
 */
export async function analyzeGarmentImage(base64Image: string): Promise<Partial<Garment>> {
  try {
    // Convertir base64 a buffer para generar hash
    const buffer = Buffer.from(base64Image, 'base64');
    const cacheKey = cacheService.getImageAnalysisKey(buffer);
    
    // Revisar caché
    const cachedAnalysis = cacheService.get<Partial<Garment>>(cacheKey);
    if (cachedAnalysis) {
      console.log('Usando análisis de imagen de la caché');
      return cachedAnalysis;
    }
    
    // Llamar a OpenAI Vision API
    // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: "Eres un experto en análisis de moda. Analiza la prenda en la imagen y proporciona detalles técnicos en formato JSON."
        },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: "Analiza esta prenda de vestir y proporciona los siguientes detalles en formato JSON:\n1. type: tipo de prenda\n2. color: color predominante\n3. style: estilo de la prenda\n4. material: material principal si es identificable\n5. occasions: array de ocasiones apropiadas para esta prenda\n6. season: temporada más adecuada para esta prenda\n7. pattern: patrón o estampado si tiene"
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
      temperature: 0.2,
      response_format: { type: "json_object" }
    });
    
    const content = response.choices[0].message.content;
    if (!content) {
      throw new Error("No se recibió respuesta del modelo");
    }
    
    try {
      const analysis = JSON.parse(content) as GarmentAnalysis;
      
      // Convertir el análisis al formato de Garment
      const garment: Partial<Garment> = {
        type: analysis.type,
        color: analysis.color,
        style: analysis.style,
        material: analysis.material,
        occasions: analysis.occasions || [],
        season: analysis.season,
        pattern: analysis.pattern
      };
      
      // Guardar en caché
      cacheService.set(cacheKey, garment);
      
      return garment;
    } catch (error) {
      console.error("Error parsing OpenAI response:", error);
      throw new Error("Error procesando el análisis de la imagen");
    }
  } catch (error) {
    console.error("Error analyzing garment image:", error);
    throw error;
  }
}

/**
 * Genera sugerencias de outfit basadas en una imagen de prenda
 */
export async function generateOutfitsFromImage(base64Image: string, preferences?: {
  styles?: string[];
  occasions?: { name: string; priority: number }[];
  seasons?: string[];
}): Promise<OutfitSuggestion[]> {
  try {
    // Primero analizamos la prenda en la imagen
    const garmentAnalysis = await analyzeGarmentImage(base64Image);
    
    // Crear una prenda con los resultados del análisis
    const garment: Garment = {
      id: 0, // ID temporal
      userId: 0, // Usuario temporal
      name: garmentAnalysis.type || "Prenda",
      type: garmentAnalysis.type || "Desconocido",
      color: garmentAnalysis.color || "Desconocido",
      style: garmentAnalysis.style || null,
      material: garmentAnalysis.material || null,
      occasions: Array.isArray(garmentAnalysis.occasions) ? garmentAnalysis.occasions : [],
      season: garmentAnalysis.season || null,
      pattern: garmentAnalysis.pattern || null,
      imageUrl: null,
      createdAt: new Date()
    };
    
    // Luego generamos outfits basados en la prenda analizada
    const outfitRequest: OutfitGenerationRequest = {
      garments: [garment],
      preferences: preferences,
      textPrompt: "Genera outfits que incluyan esta prenda como pieza central."
    };
    
    return await generateOutfitSuggestions(outfitRequest);
  } catch (error) {
    console.error("Error generating outfits from image:", error);
    throw error;
  }
}