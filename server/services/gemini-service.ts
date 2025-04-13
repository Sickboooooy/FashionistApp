import { GoogleGenerativeAI } from "@google/generative-ai";
import { cacheService } from "./cacheService";
import { log } from "../vite";
import { Garment } from "@shared/schema";

// Inicializar cliente de Google Generative AI como modelo principal
let genAI: GoogleGenerativeAI;
let model: any;

try {
  const apiKey = process.env.GEMINI2APIKEY || "";
  if (!apiKey) {
    log("API Key de Google Generative AI no configurada", "gemini-error");
    throw new Error("API Key de Gemini no configurada");
  }
  genAI = new GoogleGenerativeAI(apiKey);
  // Usar "gemini-1.5-flash" que es el modelo recomendado tras la descontinuación de los modelos anteriores
  model = genAI.getGenerativeModel({ 
    model: "gemini-1.5-flash",
    generationConfig: {
      temperature: 0.4,
      topP: 0.8,
      topK: 40,
      maxOutputTokens: 2048,
    },
  });
  log("Cliente Gemini inicializado correctamente con modelo gemini-1.5-flash", "gemini");
} catch (error) {
  log(`Error al inicializar cliente Gemini: ${error}`, "gemini-error");
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
    // Verificar que el modelo está inicializado
    if (!genAI || !model) {
      throw new Error("Cliente Gemini no inicializado correctamente");
    }
    
    // Intentar obtener resultado de caché primero
    const cacheKey = cacheService.getImageAnalysisKey(Buffer.from(base64Image, 'base64'));
    const cachedResult = cacheService.get<Partial<Garment>>(cacheKey);
    
    if (cachedResult) {
      log("Utilizando resultados en caché para análisis de imagen con Gemini", "gemini");
      return cachedResult;
    }

    // Prompt mejorado para análisis de moda
    const prompt = `Actúa como un estilista experto en moda y análisis visual. 
Analiza detalladamente esta imagen de una prenda de vestir y proporciona información profesional sobre:

1. Tipo de prenda (sé específico, por ejemplo "blazer cruzado" en lugar de solo "chaqueta")
2. Color predominante (usa términos específicos de moda como "malva", "borgoña", en lugar de colores genéricos)
3. Material (basado en la textura visible)
4. Estilo de la prenda (casual, formal, bohemio, minimalista, etc.)
5. Patrón o diseño (liso, estampado, con detalles específicos)
6. Temporada más adecuada (primavera, verano, otoño, invierno, o "todo el año")
7. Ocasiones para las que resulta apropiada (lista priorizada)

IMPORTANTE: Proporciona la respuesta ÚNICAMENTE en formato JSON siguiendo exactamente este esquema:
{
  "type": "tipo detallado de prenda",
  "color": "color específico",
  "material": "material identificado o null si no es posible determinar",
  "style": "estilo de la prenda o null si no es claro",
  "pattern": "patrón o diseño o null si es liso",
  "season": "temporada principal o null si es para todo el año",
  "occasions": ["ocasión principal", "ocasión secundaria", ...]
}

No incluyas ningún texto fuera del JSON. Solamente devuelve el objeto JSON.`;

    // Configurar el modelo para visión con manejo de timeout
    const visionModel = genAI.getGenerativeModel({ 
      model: "gemini-1.5-flash",
      generationConfig: {
        temperature: 0.2, // Temperatura baja para respuestas más precisas
        maxOutputTokens: 1024,
        responseType: "json", // Intentar forzar respuesta JSON
      }
    });
    
    // Preparar la imagen
    const imageInBase64 = { inlineData: { data: base64Image, mimeType: "image/jpeg" } };
    
    // Establecer timeout para la solicitud
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 20000); // 20 segundos máximo
    
    try {
      // Realizar la solicitud
      const result = await visionModel.generateContent({
        contents: [
          {
            role: "user",
            parts: [
              { text: prompt },
              { inlineData: { data: base64Image, mimeType: "image/jpeg" } }
            ]
          }
        ],
      });
      
      clearTimeout(timeoutId);
      
      const response = result.response;
      const text = response.text();
      
      log("Análisis de imagen con Gemini completado", "gemini");
      
      // Extraer el JSON de la respuesta
      let garmentData: Partial<Garment> = {};
      
      try {
        // Limpiar el texto para asegurar que sea un JSON válido
        let jsonText = text.trim();
        
        // Si la respuesta tiene texto adicional alrededor del JSON
        const jsonStart = jsonText.indexOf('{');
        const jsonEnd = jsonText.lastIndexOf('}') + 1;
        
        if (jsonStart >= 0 && jsonEnd > 0) {
          jsonText = jsonText.substring(jsonStart, jsonEnd);
        }
        
        // Intentar parsear directamente
        try {
          const analysisResult = JSON.parse(jsonText);
          
          // Validar y mapear los resultados al formato de Garment
          garmentData = {
            type: analysisResult.type || "No identificado",
            color: analysisResult.color || "No identificado",
            material: analysisResult.material || null,
            style: analysisResult.style || null,
            pattern: analysisResult.pattern || null,
            season: analysisResult.season || null,
            occasions: Array.isArray(analysisResult.occasions) ? analysisResult.occasions : []
          };
          
          // Guardar en caché para futuras solicitudes
          cacheService.set(cacheKey, garmentData);
          
          return garmentData;
        } catch (parseError) {
          log(`Error al parsear JSON: ${parseError}. Intentando extracción por campos...`, "gemini-warn");
          
          // Fallback: Extraer campos usando regex
          const typeMatch = text.match(/[\"']type[\"']\s*:\s*[\"']([^\"']+)[\"']/i);
          const colorMatch = text.match(/[\"']color[\"']\s*:\s*[\"']([^\"']+)[\"']/i);
          const materialMatch = text.match(/[\"']material[\"']\s*:\s*[\"']([^\"']+)[\"']/i);
          const styleMatch = text.match(/[\"']style[\"']\s*:\s*[\"']([^\"']+)[\"']/i);
          const patternMatch = text.match(/[\"']pattern[\"']\s*:\s*[\"']([^\"']+)[\"']/i);
          const seasonMatch = text.match(/[\"']season[\"']\s*:\s*[\"']([^\"']+)[\"']/i);
          
          garmentData = {
            type: typeMatch ? typeMatch[1] : "No identificado",
            color: colorMatch ? colorMatch[1] : "No identificado",
            material: materialMatch ? materialMatch[1] : null,
            style: styleMatch ? styleMatch[1] : null,
            pattern: patternMatch ? patternMatch[1] : null,
            season: seasonMatch ? seasonMatch[1] : null,
            occasions: []
          };
          
          // Intentar extraer ocasiones
          const occasionsRegex = /[\"']occasions[\"']\s*:\s*\[(.*?)\]/is;
          const occasionsMatch = text.match(occasionsRegex);
          if (occasionsMatch && occasionsMatch[1]) {
            const occasions = occasionsMatch[1]
              .split(',')
              .map(o => {
                const cleaned = o.trim().replace(/^["']|["']$/g, '');
                return cleaned && cleaned !== "null" ? cleaned : null;
              })
              .filter(Boolean);
            
            garmentData.occasions = occasions.length > 0 ? occasions : [];
          }
        }
      } catch (error) {
        log(`Error al procesar respuesta de análisis de imagen: ${error}`, "gemini-error");
        throw new Error("No se pudo procesar la respuesta del análisis de imagen");
      }
      
      // Guardar en caché para futuras solicitudes
      cacheService.set(cacheKey, garmentData);
      
      return garmentData;
    } catch (abortError) {
      clearTimeout(timeoutId);
      if (abortError.name === 'AbortError') {
        throw new Error("La solicitud a Gemini tomó demasiado tiempo y fue cancelada");
      }
      throw abortError;
    }
  } catch (error) {
    log(`Error en análisis de imagen con Gemini: ${error}`, "gemini-error");
    
    // Respuesta de fallback más descriptiva
    return { 
      type: "No identificado",
      color: "No identificado",
      material: null,
      style: null,
      pattern: null,
      season: null,
      occasions: [],
      errorMessage: error instanceof Error ? error.message : "Error desconocido en el análisis"
    };
  }
}