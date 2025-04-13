import OpenAI from "openai";
import { Garment } from "@shared/schema";
import { cacheService } from "./cacheService";
import { log } from "../vite";
import { 
  generateOutfitSuggestionsWithGemini, 
  analyzeGarmentImageWithGemini 
} from "./gemini-service";

// El modelo más reciente es "gpt-4o" que se lanzó en mayo de 2024
const DEFAULT_MODEL = "gpt-4o";

// Inicializar cliente de OpenAI (ahora como respaldo)
let openai: OpenAI | null = null;
try {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    log("API Key de OpenAI no configurada o no disponible", "openai-error");
  } else {
    openai = new OpenAI({
      apiKey: apiKey,
    });
    log("Cliente OpenAI inicializado correctamente como sistema de respaldo", "openai");
  }
} catch (error) {
  log(`Error al inicializar cliente OpenAI: ${error}. Se usará solo Gemini.`, "openai-error");
}

// Interfaz para solicitud de generación de outfit
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

// Interfaz para sugerencia de outfit
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
 * Usa Gemini como modelo principal, con respaldo a OpenAI si Gemini falla
 */
export async function generateOutfitSuggestions(request: OutfitGenerationRequest): Promise<OutfitSuggestion[]> {
  try {
    // Intentar obtener resultado de caché primero
    const cacheKey = cacheService.getOutfitsKey(request);
    const cachedResult = cacheService.get<OutfitSuggestion[]>(cacheKey);
    
    if (cachedResult) {
      log("Utilizando resultados en caché para generación de outfits", "openai");
      return cachedResult;
    }

    // Usar Gemini como modelo principal
    try {
      log("Utilizando Gemini como modelo principal para generar outfits", "gemini-primary");
      return await generateOutfitSuggestionsWithGemini(request);
    } catch (geminiError) {
      log(`Error con Gemini como modelo principal: ${geminiError}. Intentando con OpenAI como respaldo.`, "gemini-error");
      
      // Verificar si tenemos cliente de OpenAI como respaldo
      if (!openai) {
        log("Cliente OpenAI no disponible para respaldo", "openai-fallback");
        throw geminiError;
      }
      
      // OpenAI como respaldo
      try {
        const { garments = [], preferences = {}, textPrompt, season, occasion } = request;
    
        const prompt = `Actúa como un estilista experto en moda. Necesito que generes 3 sugerencias de outfits.`;
        
        const systemMessage = `Eres un experto asistente de moda que ayuda a generar sugerencias de outfits personalizados.
Debes proporcionar respuestas detalladas, completas y en formato JSON.`;

        log("Solicitando generación de outfits a OpenAI como respaldo...", "openai");
        
        const messages = [
          { role: "system", content: systemMessage },
          { role: "user", content: generateOutfitPrompt(request) }
        ];
        
        const completion = await openai.chat.completions.create({
          model: DEFAULT_MODEL,
          messages: messages as any,
          temperature: 0.7,
          response_format: { type: "json_object" },
        });
        
        const content = completion.choices[0].message.content;
        
        if (!content) {
          throw new Error("No se recibió respuesta del modelo");
        }
        
        const parsedResponse = JSON.parse(content);
        let outfits: OutfitSuggestion[];
        
        // Verificar el formato de la respuesta
        if (parsedResponse.outfits && Array.isArray(parsedResponse.outfits)) {
          outfits = parsedResponse.outfits;
        } else if (parsedResponse.suggestions && Array.isArray(parsedResponse.suggestions)) {
          outfits = parsedResponse.suggestions;
        } else if (Array.isArray(parsedResponse)) {
          outfits = parsedResponse;
        } else {
          // Intentar extraer los outfits de propiedades numeradas (outfit1, outfit2, etc.)
          const extractedOutfits: OutfitSuggestion[] = [];
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
      } catch (openaiError) {
        log(`Error al procesar respuesta de OpenAI: ${openaiError}`, "openai-error");
        throw geminiError; // Lanzamos el error original de Gemini
      }
    }
  } catch (error) {
    log(`Error en generación de outfits: ${error}`, "ai-error");
    throw error;
  }
}

/**
 * Genera el prompt para OpenAI
 */
function generateOutfitPrompt(request: OutfitGenerationRequest): string {
  const { garments = [], preferences = {}, textPrompt, season, occasion } = request;
  
  let prompt = `Actúa como un estilista experto en moda. Necesito que generes 3 sugerencias de outfits.`;
  
  // Añadir información sobre las prendas disponibles
  if (garments.length > 0) {
    prompt += `\n\nPrendas disponibles:`;
    garments.forEach(garment => {
      prompt += `\n- ${garment.name} (Tipo: ${garment.type}, Color: ${garment.color}`;
      if (garment.material) prompt += `, Material: ${garment.material}`;
      if (garment.style) prompt += `, Estilo: ${garment.style}`;
      if (garment.pattern) prompt += `, Patrón: ${garment.pattern}`;
      if (garment.season) prompt += `, Temporada: ${garment.season}`;
      prompt += `)`;
    });
  }
  
  // Añadir información sobre preferencias
  if (preferences.styles && preferences.styles.length > 0) {
    prompt += `\n\nEstilos preferidos: ${preferences.styles.join(", ")}`;
  }
  
  if (preferences.occasions && preferences.occasions.length > 0) {
    const sortedOccasions = [...preferences.occasions].sort((a, b) => b.priority - a.priority);
    prompt += `\n\nOcasiones (por prioridad): ${sortedOccasions.map(o => o.name).join(", ")}`;
  }
  
  if (preferences.seasons && preferences.seasons.length > 0) {
    prompt += `\n\nTemporadas preferidas: ${preferences.seasons.join(", ")}`;
  }
  
  // Añadir información específica de la solicitud
  if (textPrompt) {
    prompt += `\n\nSolicitud específica: ${textPrompt}`;
  }
  
  if (season) {
    prompt += `\n\nTemporada para el outfit: ${season}`;
  }
  
  if (occasion) {
    prompt += `\n\nOcasión para el outfit: ${occasion}`;
  }
  
  // Indicaciones para el formato de la respuesta
  prompt += `\n\nPor favor, proporciona tus sugerencias en formato JSON con la siguiente estructura:
{
  "outfits": [
    {
      "name": "Nombre del outfit",
      "description": "Descripción detallada del outfit",
      "occasion": "Ocasión para la que es adecuado",
      "season": "Temporada del año",
      "pieces": ["Prenda 1", "Prenda 2", ...],
      "reasoning": "Explicación de por qué estas prendas funcionan bien juntas"
    },
    ...
  ]
}`;

  return prompt;
}

/**
 * Estructura de análisis de prendas
 */
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
 * Usa Gemini como principal, con respaldo a OpenAI
 */
export async function analyzeGarmentImage(base64Image: string): Promise<Partial<Garment>> {
  try {
    // Intentar obtener resultado de caché primero
    const cacheKey = cacheService.getImageAnalysisKey(Buffer.from(base64Image, 'base64'));
    const cachedResult = cacheService.get<Partial<Garment>>(cacheKey);
    
    if (cachedResult) {
      log("Utilizando resultados en caché para análisis de imagen", "ai-cache");
      return cachedResult;
    }

    // Usar Gemini como modelo principal
    try {
      log("Utilizando Gemini como modelo principal para análisis de imagen", "gemini-primary");
      const result = await analyzeGarmentImageWithGemini(base64Image);
      
      // Guardar en caché
      cacheService.set(cacheKey, result);
      
      return result;
    } catch (geminiError) {
      log(`Error con Gemini para análisis de imagen: ${geminiError}. Intentando con OpenAI como respaldo.`, "gemini-error");
      
      // Verificar si tenemos cliente de OpenAI como respaldo
      if (!openai) {
        log("Cliente OpenAI no disponible para respaldo de análisis de imagen", "openai-fallback");
        throw geminiError;
      }

      // OpenAI como respaldo para análisis de imagen
      try {
        log("Solicitando análisis de imagen a OpenAI como respaldo...", "openai");
        
        const prompt = `Analiza esta imagen de una prenda de vestir y proporciona los siguientes detalles:
1. Tipo de prenda
2. Color predominante
3. Material (si es identificable)
4. Estilo de la prenda
5. Patrón o diseño (si tiene)
6. Temporada adecuada
7. Ocasiones para las que es apropiada (como lista)

Proporciona tu respuesta como un objeto JSON con las siguientes propiedades:
type, color, material, style, pattern, season, occasions (array)`;

        const response = await openai.chat.completions.create({
          model: DEFAULT_MODEL,
          messages: [
            {
              role: "user",
              content: [
                {
                  type: "text",
                  text: prompt
                },
                {
                  type: "image_url",
                  image_url: {
                    url: `data:image/jpeg;base64,${base64Image}`
                  }
                }
              ],
            },
          ],
          temperature: 0.2,
          response_format: { type: "json_object" },
        });

        const content = response.choices[0].message.content;
        
        if (!content) {
          throw new Error("No se recibió respuesta del modelo");
        }
        
        const analysis = JSON.parse(content) as GarmentAnalysis;
        
        // Mapear los resultados al formato de Garment
        const garment: Partial<Garment> = {
          type: analysis.type,
          color: analysis.color,
          material: analysis.material,
          style: analysis.style,
          pattern: analysis.pattern,
          season: analysis.season,
          occasions: Array.isArray(analysis.occasions) 
            ? analysis.occasions 
            : []
        };
        
        // Guardar en caché
        cacheService.set(cacheKey, garment);
        
        return garment;
      } catch (openaiError) {
        log(`Error al procesar análisis de imagen con OpenAI: ${openaiError}`, "openai-error");
        throw geminiError; // Lanzamos el error original de Gemini
      }
    }
  } catch (error) {
    log(`Error en análisis de imagen: ${error}`, "ai-error");
    return { 
      type: "No identificado",
      color: "No identificado",
      occasions: []
    };
  }
}

/**
 * Genera sugerencias de outfit basadas en una imagen de prenda
 * Usa el análisis de imagen de Gemini (modelo principal) para extraer características
 */
export async function generateOutfitsFromImage(base64Image: string, preferences?: {
  styles?: string[];
  occasions?: { name: string; priority: number }[];
  seasons?: string[];
}): Promise<OutfitSuggestion[]> {
  try {
    // Primero analizamos la prenda en la imagen usando Gemini como modelo principal
    const garmentAnalysis = await analyzeGarmentImageWithGemini(base64Image);
    
    // Crear una prenda con los resultados del análisis
    const garment: Garment = {
      id: 0, // ID temporal
      userId: 0, // Usuario temporal
      name: garmentAnalysis.type || "Prenda",
      type: garmentAnalysis.type || "Desconocido",
      color: garmentAnalysis.color || "Desconocido",
      style: garmentAnalysis.style || null,
      material: garmentAnalysis.material || null,
      occasions: garmentAnalysis.occasions || [],
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
    log(`Error generando outfits desde imagen: ${error}`, "ai-error");
    throw error;
  }
}