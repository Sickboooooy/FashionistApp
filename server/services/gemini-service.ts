import { GoogleGenerativeAI } from "@google/generative-ai";
import { cacheService } from "./cacheService";
import { log } from "../vite";
import { Garment } from "@shared/schema";

// Inicializar cliente de Google Generative AI como modelo principal
const genAI = new GoogleGenerativeAI(process.env.FASHION_GEMINI_API_KEY || "");
// Usar "gemini-pro" en lugar de "gemini-1.5-pro" para mayor compatibilidad
const model = genAI.getGenerativeModel({ model: "gemini-pro" });

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
 * Genera sugerencias de outfit utilizando Google Gemini como modelo principal
 */
export async function generateOutfitSuggestionsWithGemini(request: OutfitGenerationRequest): Promise<OutfitSuggestion[]> {
  try {
    // Intentar obtener resultado de caché primero
    const cacheKey = cacheService.getOutfitsKey(request);
    const cachedResult = cacheService.get<OutfitSuggestion[]>(cacheKey);
    
    if (cachedResult) {
      log("Utilizando resultados en caché para generación de outfits con Gemini", "gemini");
      return cachedResult;
    }

    const prompt = generateOutfitPrompt(request);
    
    log("Solicitando generación de outfits a Gemini...", "gemini");
    
    const result = await model.generateContent(prompt);
    const response = result.response;
    const text = response.text();
    
    // Procesar la respuesta para extraer las sugerencias de outfits
    let outfits: OutfitSuggestion[];
    
    try {
      // Intentar parsear la respuesta como JSON
      const jsonStartIndex = text.indexOf('[');
      const jsonEndIndex = text.lastIndexOf(']') + 1;
      
      if (jsonStartIndex >= 0 && jsonEndIndex > jsonStartIndex) {
        const jsonStr = text.substring(jsonStartIndex, jsonEndIndex);
        outfits = JSON.parse(jsonStr);
      } else {
        throw new Error("No se encontró formato JSON válido en la respuesta");
      }
    } catch (error) {
      log(`Error al parsear respuesta de Gemini: ${error}`, "gemini-error");
      outfits = getFallbackOutfits(request);
    }
    
    // Guardar en caché para futuras solicitudes
    cacheService.set(cacheKey, outfits);
    
    return outfits;
  } catch (error) {
    log(`Error en generación de outfits con Gemini: ${error}`, "gemini-error");
    return getFallbackOutfits(request);
  }
}

/**
 * Genera el prompt para solicitar sugerencias de outfits a Gemini
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
  prompt += `\n\nPor favor, proporciona tus sugerencias en formato JSON con el siguiente esquema:
[
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

Asegúrate de que la respuesta sea solo el array JSON sin texto adicional.`;

  return prompt;
}

/**
 * Genera outfits de respaldo en caso de error
 */
function getFallbackOutfits(request: OutfitGenerationRequest): OutfitSuggestion[] {
  const { occasion = "casual", season = "any" } = request;
  
  return [
    {
      name: "Conjunto Versátil",
      description: "Un conjunto versátil que funciona para múltiples ocasiones",
      occasion: occasion,
      season: season,
      pieces: ["Camisa blanca", "Jeans azul oscuro", "Zapatos negros"],
      reasoning: "Combinación clásica que nunca falla. La camisa blanca es versátil y los jeans son cómodos y combinan con todo."
    },
    {
      name: "Look Elegante Casual",
      description: "Un look elegante pero casual, perfecto para salidas o reuniones informales",
      occasion: occasion,
      season: season,
      pieces: ["Blusa ligera", "Pantalón de vestir", "Accesorios minimalistas"],
      reasoning: "Elegante sin ser demasiado formal. El pantalón de vestir eleva el look mientras que la blusa ligera mantiene la comodidad."
    },
    {
      name: "Estilo Contemporáneo",
      description: "Un conjunto moderno con toques de tendencia actual",
      occasion: occasion,
      season: season,
      pieces: ["Camiseta neutra", "Chaqueta ligera", "Pantalón o falda a elección"],
      reasoning: "Look adaptable y contemporáneo. La chaqueta añade estructura mientras que las piezas básicas permiten versatilidad."
    }
  ];
}

/**
 * Analiza una imagen de prenda utilizando Google Gemini Vision como modelo principal
 */
export async function analyzeGarmentImageWithGemini(base64Image: string): Promise<Partial<Garment>> {
  try {
    // Intentar obtener resultado de caché primero
    const cacheKey = cacheService.getImageAnalysisKey(Buffer.from(base64Image, 'base64'));
    const cachedResult = cacheService.get<Partial<Garment>>(cacheKey);
    
    if (cachedResult) {
      log("Utilizando resultados en caché para análisis de imagen con Gemini", "gemini");
      return cachedResult;
    }

    const prompt = `Analiza esta imagen de una prenda de vestir y proporciona detalles como:
1. Tipo de prenda
2. Color predominante
3. Material (si es identificable)
4. Estilo de la prenda
5. Patrón o diseño
6. Temporada adecuada
7. Ocasiones para las que es apropiada

Proporciona la respuesta en formato JSON con el siguiente esquema:
{
  "type": "tipo de prenda",
  "color": "color predominante",
  "material": "material si es identificable",
  "style": "estilo de la prenda",
  "pattern": "patrón o diseño",
  "season": "temporada adecuada",
  "occasions": ["ocasión 1", "ocasión 2", ...]
}`;

    // Configurar el modelo para visión (gemini-pro-vision es más compatible que gemini-1.5-pro-vision)
    const visionModel = genAI.getGenerativeModel({ model: "gemini-pro-vision" });
    
    // Preparar la imagen
    const imageInBase64 = { inlineData: { data: base64Image, mimeType: "image/jpeg" } };
    
    // Realizar la solicitud
    const result = await visionModel.generateContent([prompt, imageInBase64]);
    const response = result.response;
    const text = response.text();
    
    // Extraer el JSON de la respuesta
    let garmentData: Partial<Garment> = {};
    
    try {
      // Buscar el JSON en la respuesta
      const jsonStartIndex = text.indexOf('{');
      const jsonEndIndex = text.lastIndexOf('}') + 1;
      
      if (jsonStartIndex >= 0 && jsonEndIndex > jsonStartIndex) {
        const jsonStr = text.substring(jsonStartIndex, jsonEndIndex);
        const analysisResult = JSON.parse(jsonStr);
        
        // Mapear los resultados al formato de Garment
        garmentData = {
          type: analysisResult.type,
          color: analysisResult.color,
          material: analysisResult.material,
          style: analysisResult.style,
          pattern: analysisResult.pattern,
          season: analysisResult.season,
          occasions: Array.isArray(analysisResult.occasions) ? analysisResult.occasions : []
        };
      } else {
        throw new Error("No se encontró formato JSON válido en la respuesta");
      }
    } catch (error) {
      log(`Error al parsear respuesta de análisis de imagen con Gemini: ${error}`, "gemini-error");
      garmentData = {
        type: "No identificado",
        color: "No identificado",
        occasions: []
      };
    }
    
    // Guardar en caché para futuras solicitudes
    cacheService.set(cacheKey, garmentData);
    
    return garmentData;
  } catch (error) {
    log(`Error en análisis de imagen con Gemini: ${error}`, "gemini-error");
    return { 
      type: "No identificado",
      color: "No identificado",
      occasions: []
    };
  }
}