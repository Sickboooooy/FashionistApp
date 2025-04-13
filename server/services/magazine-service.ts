import OpenAI from "openai";
import crypto from "crypto";
import { cacheService } from "./cacheService";
import { log } from "../vite";
import { GoogleGenerativeAI } from "@google/generative-ai";

// Usar el cliente OpenAI compartido
let openai: OpenAI | null = null;
try {
  openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });
  log("Cliente OpenAI inicializado correctamente para revista", "magazine");
} catch (error) {
  log(`Error al inicializar cliente OpenAI para revista: ${error}`, "magazine-error");
}

// Inicializar cliente de Google Gemini como respaldo
let genAI: GoogleGenerativeAI | null = null;
try {
  genAI = new GoogleGenerativeAI(process.env.FASHION_GEMINI_API_KEY || "");
  log("Cliente Google Generative AI inicializado correctamente para revista", "magazine");
} catch (error) {
  log(`Error al inicializar Google Generative AI para revista: ${error}`, "magazine-error");
}

// El modelo más reciente es "gpt-4o" que se lanzó en mayo de 2024. No lo cambies a menos que el usuario lo solicite explícitamente
const DEFAULT_MODEL = "gpt-4o";

interface BaseOutfit {
  id: number;
  name: string;
  description: string;
  occasion: string;
  season?: string;
  imageUrl?: string;
  pieces?: string[];
  reasoning?: string;
}

interface OutfitWithEditorial extends BaseOutfit {
  editorial: string;
}

interface MagazineGenerationRequest {
  outfits: BaseOutfit[];
  template: string;
  userPreferences?: {
    styles?: string[];
    occasions?: { name: string; priority: number }[];
    seasons?: string[];
  };
  userName?: string;
}

export interface MagazineContent {
  title: string;
  subtitle: string;
  introduction: string;
  outfits: OutfitWithEditorial[];
  conclusion: string;
  template: string;
}

/**
 * Genera contenido de revista basado en outfits y preferencias
 * Con respaldo a Gemini si OpenAI falla
 */
export async function generateMagazineContent(request: MagazineGenerationRequest): Promise<MagazineContent> {
  try {
    // Generar hash para la clave de caché
    const outfitsStr = JSON.stringify(request.outfits);
    const outfitsHash = crypto.createHash('md5').update(outfitsStr).digest('hex');
    
    let preferencesHash = '';
    if (request.userPreferences) {
      const preferencesStr = JSON.stringify(request.userPreferences);
      preferencesHash = crypto.createHash('md5').update(preferencesStr).digest('hex');
    }
    
    // Clave de caché completa
    const cacheKey = cacheService.getMagazineKey({
      outfitsHash,
      preferenceHash: preferencesHash, // Corregido de preferencesHash a preferenceHash
      template: request.template,
      userName: request.userName
    });
    
    // Comprobar caché
    const cachedContent = cacheService.get<MagazineContent>(cacheKey);
    if (cachedContent) {
      log("Usando contenido de revista desde caché", "magazine");
      return cachedContent;
    }
    
    // Verificar si tenemos cliente de OpenAI
    if (!openai) {
      log("Cliente OpenAI no disponible para revista, utilizando Gemini como respaldo", "magazine-fallback");
      return await generateMagazineWithGemini(request);
    }
    
    // Generar el prompt
    const prompt = generateMagazinePrompt(request);
    
    log("Solicitando generación de revista a OpenAI...", "magazine");
    
    // Llamar a OpenAI
    const completion = await openai.chat.completions.create({
      model: DEFAULT_MODEL,
      messages: [
        { role: "system", content: "Eres un editor profesional de revistas de moda. Tu trabajo es crear contenido de alta calidad que sea interesante, informativo y estilizado." },
        { role: "user", content: prompt }
      ],
      temperature: 0.7,
      response_format: { type: "json_object" },
    });
    
    const content = completion.choices[0].message.content;
    
    if (!content) {
      throw new Error("No se recibió respuesta del modelo");
    }
    
    try {
      // Procesar la respuesta
      const result = JSON.parse(content);
      
      // Validar estructura 
      const magazine: MagazineContent = {
        title: result.title || "Revista de Moda Selene Style",
        subtitle: result.subtitle || "Edición Especial",
        introduction: result.introduction || "Bienvenido a esta edición especial de moda.",
        outfits: result.outfits || [],
        conclusion: result.conclusion || "Esperamos que hayas disfrutado de esta selección de moda.",
        template: request.template
      };
      
      // Guardar en caché
      cacheService.set(cacheKey, magazine);
      
      return magazine;
    } catch (error) {
      log(`Error al procesar respuesta de revista con OpenAI: ${error}. Utilizando Gemini como respaldo`, "magazine-error");
      return await generateMagazineWithGemini(request);
    }
  } catch (error) {
    log(`Error en generación de revista con OpenAI: ${error}. Utilizando Gemini como respaldo`, "magazine-error");
    return await generateMagazineWithGemini(request);
  }
}

/**
 * Genera contenido de revista usando Google Gemini como respaldo
 */
async function generateMagazineWithGemini(request: MagazineGenerationRequest): Promise<MagazineContent> {
  try {
    if (!genAI) {
      log("Cliente Gemini no disponible para revista, usando respuesta predeterminada", "magazine-fallback");
      return getDefaultMagazineContent(request);
    }
    
    const prompt = generateMagazinePrompt(request);
    
    log("Solicitando generación de revista a Gemini...", "magazine-gemini");
    
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro" });
    
    const result = await model.generateContent(prompt);
    const response = result.response;
    const text = response.text();
    
    // Procesar la respuesta para extraer JSON
    try {
      const jsonStartIndex = text.indexOf('{');
      const jsonEndIndex = text.lastIndexOf('}') + 1;
      
      if (jsonStartIndex >= 0 && jsonEndIndex > jsonStartIndex) {
        const jsonStr = text.substring(jsonStartIndex, jsonEndIndex);
        const parsedResult = JSON.parse(jsonStr);
        
        // Validar estructura 
        const magazine: MagazineContent = {
          title: parsedResult.title || "Revista de Moda Selene Style",
          subtitle: parsedResult.subtitle || "Edición Especial",
          introduction: parsedResult.introduction || "Bienvenido a esta edición especial de moda.",
          outfits: parsedResult.outfits || [],
          conclusion: parsedResult.conclusion || "Esperamos que hayas disfrutado de esta selección de moda.",
          template: request.template
        };
        
        return magazine;
      } else {
        throw new Error("No se encontró formato JSON válido en la respuesta de Gemini");
      }
    } catch (error) {
      log(`Error al procesar respuesta de revista con Gemini: ${error}. Usando respuesta predeterminada`, "magazine-gemini-error");
      return getDefaultMagazineContent(request);
    }
  } catch (error) {
    log(`Error en generación de revista con Gemini: ${error}. Usando respuesta predeterminada`, "magazine-gemini-error");
    return getDefaultMagazineContent(request);
  }
}

/**
 * Genera el prompt para la solicitud a OpenAI
 */
function generateMagazinePrompt(request: MagazineGenerationRequest): string {
  const { outfits, template, userPreferences, userName } = request;
  
  let prompt = `Genera contenido para una revista de moda personalizada con la siguiente estructura:
  
1. Título creativo para la revista
2. Subtítulo que capture la esencia de la colección
3. Introducción atractiva
4. Contenido editorial para cada outfit
5. Conclusión que resuma las tendencias y recomendaciones
  
La revista usará la plantilla "${template}".`;
  
  if (userName) {
    prompt += `\nLa revista es personalizada para ${userName}.`;
  }
  
  // Añadir información de outfits
  prompt += "\n\nOutfits a incluir:";
  outfits.forEach((outfit, index) => {
    prompt += `\n\nOutfit ${index + 1}: ${outfit.name}
Descripción: ${outfit.description}
Ocasión: ${outfit.occasion}${outfit.season ? `\nTemporada: ${outfit.season}` : ''}${outfit.pieces ? `\nPiezas: ${outfit.pieces.join(', ')}` : ''}${outfit.reasoning ? `\nRazonamiento: ${outfit.reasoning}` : ''}`;
  });
  
  // Añadir información de preferencias
  if (userPreferences) {
    prompt += "\n\nPreferencias del usuario:";
    
    if (userPreferences.styles && userPreferences.styles.length > 0) {
      prompt += `\nEstilos favoritos: ${userPreferences.styles.join(', ')}`;
    }
    
    if (userPreferences.occasions && userPreferences.occasions.length > 0) {
      const sortedOccasions = [...userPreferences.occasions].sort((a, b) => b.priority - a.priority);
      prompt += `\nOcasiones principales: ${sortedOccasions.map(o => o.name).join(', ')}`;
    }
    
    if (userPreferences.seasons && userPreferences.seasons.length > 0) {
      prompt += `\nTemporadas preferidas: ${userPreferences.seasons.join(', ')}`;
    }
  }
  
  // Instrucciones específicas para el formato de salida
  prompt += `\n\nPor favor proporciona la respuesta como un objeto JSON con los siguientes campos:
{
  "title": "Título de la revista",
  "subtitle": "Subtítulo descriptivo",
  "introduction": "Introducción atractiva de la revista",
  "outfits": [
    {
      "id": 1,
      "name": "Nombre del outfit 1",
      "description": "Descripción del outfit 1",
      "occasion": "Ocasión para el outfit 1",
      "season": "Temporada para el outfit 1",
      "editorial": "Texto editorial detallado para este outfit"
    },
    ... (resto de outfits)
  ],
  "conclusion": "Texto de conclusión de la revista"
}`;
  
  return prompt;
}

/**
 * Genera contenido de revista por defecto (fallback)
 */
function getDefaultMagazineContent(request: MagazineGenerationRequest): MagazineContent {
  const { outfits, template } = request;
  
  // Crear outfits con editorial
  const outfitsWithEditorial: OutfitWithEditorial[] = outfits.map(outfit => ({
    ...outfit,
    editorial: `Este outfit "${outfit.name}" es perfecto para ${outfit.occasion}. ${outfit.description} Ideal para lucir con confianza y estilo.`
  }));
  
  return {
    title: "Selene Style: Tu Revista Personal de Moda",
    subtitle: "Elegancia y Estilo para Cada Ocasión",
    introduction: "Bienvenido a esta edición especial de Selene Style, donde encontrarás outfits cuidadosamente seleccionados que reflejan tu estilo personal y las últimas tendencias de la moda. Cada conjunto ha sido diseñado pensando en versatilidad, elegancia y comodidad.",
    outfits: outfitsWithEditorial,
    conclusion: "Esperamos que hayas disfrutado de esta cuidadosa selección de outfits. Recuerda que la verdadera elegancia está en cómo te sientes con lo que llevas puesto. ¡Experimenta, combina y crea tu propio estilo único!",
    template: template
  };
}