import OpenAI from 'openai';
import { Outfit } from '../../shared/schema';

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

export async function generateMagazineContent(request: MagazineGenerationRequest): Promise<MagazineContent> {
  // Verificar si hay un API key de OpenAI
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    console.error('No OpenAI API key found');
    // Devolver contenido simulado para pruebas si no hay API key
    return getDefaultMagazineContent(request);
  }

  const openai = new OpenAI({ apiKey });

  try {
    // Construimos el prompt para la generación de contenido de revista
    const prompt = generateMagazinePrompt(request);

    const response = await openai.chat.completions.create({
      model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
      messages: [
        {
          role: "system",
          content: "Eres un editor experto de revistas de moda de alta gama. Tu tarea es crear contenido de revista personalizado en español con un tono sofisticado y elegante."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      response_format: { type: "json_object" }
    });

    const responseContent = response.choices[0].message.content;
    
    if (!responseContent) {
      throw new Error('No content in OpenAI response');
    }

    const magazineContent = JSON.parse(responseContent) as MagazineContent;
    
    // Asegurarnos de que la respuesta tenga la estructura esperada
    if (!magazineContent.title || !magazineContent.introduction || !Array.isArray(magazineContent.outfits)) {
      throw new Error('Invalid magazine structure in OpenAI response');
    }

    // Añadir el tipo de plantilla a la respuesta
    magazineContent.template = request.template;

    return magazineContent;
  } catch (error) {
    console.error('Error generating magazine content:', error);
    // Devolver contenido por defecto en caso de error
    return getDefaultMagazineContent(request);
  }
}

function generateMagazinePrompt(request: MagazineGenerationRequest): string {
  const { outfits, template, userPreferences, userName } = request;
  
  // Extraer estilos y ocasiones de las preferencias
  const styles = userPreferences?.styles || [];
  const occasions = userPreferences?.occasions?.map(o => o.name) || [];
  const seasons = userPreferences?.seasons || [];
  
  // Construir el prompt
  return `
Crea contenido para una revista de moda personalizada basada en los siguientes conjuntos (outfits):

${outfits.map((outfit, index) => `
CONJUNTO ${index + 1}:
Nombre: ${outfit.name}
Descripción: ${outfit.description}
Ocasión: ${outfit.occasion}
Temporada: ${outfit.season || 'No especificada'}
${outfit.pieces ? `Piezas: ${outfit.pieces.join(', ')}` : ''}
${outfit.reasoning ? `Razonamiento: ${outfit.reasoning}` : ''}
`).join('\n')}

PLANTILLA: ${template}

${userName ? `NOMBRE DE USUARIO: ${userName}` : ''}

${styles.length > 0 ? `ESTILOS PREFERIDOS: ${styles.join(', ')}` : ''}
${occasions.length > 0 ? `OCASIONES PREFERIDAS: ${occasions.join(', ')}` : ''}
${seasons.length > 0 ? `TEMPORADAS PREFERIDAS: ${seasons.join(', ')}` : ''}

Genera un contenido de revista completo en formato JSON con los siguientes campos:
1. "title": Un título atractivo para la revista
2. "subtitle": Un subtítulo complementario
3. "introduction": Una introducción elegante que presente los conjuntos y el tema general
4. "outfits": Un array con información detallada de cada conjunto, incluyendo:
   - Todos los campos originales de cada conjunto (id, name, description, occasion, etc.)
   - Un nuevo campo "editorial" con un texto editorial sofisticado y personalizado para cada conjunto
5. "conclusion": Un párrafo de conclusión que cierre la revista

El contenido debe ser sofisticado, utilizar lenguaje de alta moda, y mantener un tono exclusivo como las revistas de moda de lujo. Debe estar completamente en español.

La revista debe adaptarse al estilo de la plantilla "${template}" en términos de tono y presentación.

Responde únicamente con el objeto JSON sin comentarios adicionales.
`;
}

// Función para generar contenido de revista por defecto (fallback)
function getDefaultMagazineContent(request: MagazineGenerationRequest): MagazineContent {
  const { outfits, template } = request;
  
  // Crear contenido editorial básico para cada outfit
  const outfitsWithEditorial = outfits.map(outfit => ({
    ...outfit,
    editorial: `Este elegante conjunto "${outfit.name}" es perfecto para ${outfit.occasion}. Una combinación sofisticada que refleja estilo y personalidad.`
  }));

  return {
    title: "Tu Colección Personalizada",
    subtitle: "Elegancia y estilo que define tu esencia",
    introduction: "Bienvenido a tu revista personalizada de moda. Esta colección representa una cuidadosa selección de conjuntos que reflejan tu estilo único y preferencias personales. Cada pieza ha sido elegida para complementar tu guardarropa y realzar tu presencia en diferentes ocasiones.",
    outfits: outfitsWithEditorial,
    conclusion: "Esta colección personalizada representa solo el comienzo de las infinitas posibilidades para expresar tu estilo. La moda es un viaje constante de autodescubrimiento y expresión. Continúa explorando, mezclando y creando conjuntos que cuenten tu historia única.",
    template
  };
}