import OpenAI from "openai";
import crypto from "crypto";
import { cacheService } from "./cacheService";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

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
 */
export async function generateMagazineContent(request: MagazineGenerationRequest): Promise<MagazineContent> {
  try {
    // Generar hash para la clave de caché
    const outfitsStr = JSON.stringify(request.outfits);
    const outfitsHash = crypto.createHash('md5').update(outfitsStr).digest('hex');
    
    let preferenceHash;
    if (request.userPreferences) {
      const prefStr = JSON.stringify(request.userPreferences);
      preferenceHash = crypto.createHash('md5').update(prefStr).digest('hex');
    }
    
    // Revisar caché
    const cacheKey = cacheService.getMagazineKey({
      outfitsHash: outfitsHash,
      template: request.template,
      preferenceHash,
      userName: request.userName
    });
    
    // Revisar si ya está en caché
    const cachedContent = cacheService.get<MagazineContent>(cacheKey);
    if (cachedContent) {
      console.log('Usando contenido de revista de la caché');
      return cachedContent;
    }
    
    // Generar el prompt para OpenAI
    const prompt = generateMagazinePrompt(request);
    
    // Llamar a la API de OpenAI
    // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: "Eres un editor de revista de moda especializado en crear contenido editorial y descriptivo para acompañar outfits. Debes generar contenido creativo y detallado en español, usando un tono que coincida con la plantilla solicitada."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.8,
      response_format: { type: "json_object" }
    });
    
    // Extraer y procesar la respuesta
    const content = response.choices[0].message.content;
    if (!content) {
      throw new Error("No se pudo generar el contenido de la revista");
    }
    
    try {
      const magazineContent = JSON.parse(content) as MagazineContent;
      
      // Añadir la plantilla al resultado
      magazineContent.template = request.template;
      
      // Guardar en caché
      cacheService.set(cacheKey, magazineContent);
      
      return magazineContent;
    } catch (error) {
      console.error("Error parsing OpenAI response:", error);
      // En caso de error, devolver un contenido por defecto
      return getDefaultMagazineContent(request);
    }
  } catch (error) {
    console.error("Error generando contenido de revista:", error);
    return getDefaultMagazineContent(request);
  }
}

/**
 * Genera el prompt para la solicitud a OpenAI
 */
function generateMagazinePrompt(request: MagazineGenerationRequest): string {
  const { outfits, template, userPreferences, userName } = request;
  
  let stylesText = "";
  let occasionsText = "";
  let seasonsText = "";
  
  if (userPreferences) {
    if (userPreferences.styles && userPreferences.styles.length > 0) {
      stylesText = `Estilos preferidos: ${userPreferences.styles.join(", ")}.`;
    }
    
    if (userPreferences.occasions && userPreferences.occasions.length > 0) {
      const sortedOccasions = [...userPreferences.occasions].sort((a, b) => b.priority - a.priority);
      occasionsText = `Ocasiones prioritarias: ${sortedOccasions.map(o => o.name).join(", ")}.`;
    }
    
    if (userPreferences.seasons && userPreferences.seasons.length > 0) {
      seasonsText = `Temporadas favoritas: ${userPreferences.seasons.join(", ")}.`;
    }
  }
  
  const outfitsText = outfits.map((outfit, index) => {
    return `
Outfit ${index + 1}:
- Nombre: ${outfit.name}
- Descripción: ${outfit.description}
- Ocasión: ${outfit.occasion}
- Temporada: ${outfit.season || "Cualquiera"}
${outfit.pieces ? `- Piezas: ${outfit.pieces.join(", ")}` : ""}
${outfit.reasoning ? `- Razonamiento: ${outfit.reasoning}` : ""}
`;
  }).join("\n");
  
  const templateInfo: Record<string, string> = {
    "vogue": "tono sofisticado, vanguardista y autoritario. Usa un lenguaje refinado con referencias a tendencias globales.",
    "elle": "tono accesible, optimista y personal. Usa un lenguaje cercano y con énfasis en el empoderamiento.",
    "bazaar": "tono lujoso, artístico y exclusivo. Usa un lenguaje elevado con referencias culturales.",
    "vanity": "tono glamoroso, narrativo y con personalidad. Usa un lenguaje que cuenta historias.",
    "selene": "tono exclusivo, detallado y aspiracional. Usa un lenguaje que evoque sensaciones de lujo y distinción."
  };
  
  const templateKey = template.toLowerCase();
  const templateTone = templateKey in templateInfo ? templateInfo[templateKey] : templateInfo.vogue;
  
  return `
Genera contenido para una revista de moda personalizada con los siguientes outfits:

${outfitsText}

${stylesText}
${occasionsText}
${seasonsText}

La revista usará la plantilla "${template}" que tiene un ${templateTone}
${userName ? `La revista está personalizada para ${userName}.` : ""}

Genera un JSON con la siguiente estructura:
{
  "title": "Título atractivo para la revista",
  "subtitle": "Subtítulo complementario",
  "introduction": "Párrafo de introducción que mencione las tendencias actuales y presente el tema central de la revista",
  "outfits": [
    {
      "id": número,
      "name": "nombre del outfit",
      "description": "descripción original del outfit",
      "occasion": "ocasión del outfit",
      "season": "temporada del outfit",
      "editorial": "texto editorial único de al menos 150 palabras que describa este outfit en particular, su esencia, cómo llevarlo y por qué es especial"
    }
    // Repite para cada outfit
  ],
  "conclusion": "Párrafo de conclusión que integre todos los outfits y ofrezca consejos finales"
}
`;
}

/**
 * Genera contenido de revista por defecto (fallback)
 */
function getDefaultMagazineContent(request: MagazineGenerationRequest): MagazineContent {
  const { outfits, template } = request;
  
  // Crear outfits con editorial por defecto
  const outfitsWithEditorial: OutfitWithEditorial[] = outfits.map(outfit => ({
    ...outfit,
    editorial: `Este conjunto ${outfit.name} es perfecto para ${outfit.occasion}. Combina piezas versátiles que reflejan un estilo contemporáneo y funcional. La combinación de colores y texturas crea un look equilibrado que te hará destacar sin esfuerzo. Puedes adaptar este outfit agregando accesorios según la ocasión, desde una joyería minimalista para un look casual hasta piezas más elaboradas para eventos especiales.`
  }));
  
  return {
    title: "Tu Estilo Personal",
    subtitle: "Outfits que Expresan tu Esencia",
    introduction: "La moda es una forma de expresión personal que va más allá de las tendencias del momento. En esta colección, hemos seleccionado conjuntos que reflejan versatilidad y estilo atemporal, adaptados a diferentes ocasiones y necesidades.",
    outfits: outfitsWithEditorial,
    conclusion: "Estos conjuntos representan una base versátil para tu guardarropa. Recuerda que la confianza es el mejor complemento para cualquier outfit. Experimenta, adapta y haz que estos looks sean tuyos, añadiendo tu toque personal a cada uno.",
    template
  };
}