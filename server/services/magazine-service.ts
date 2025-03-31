// Import base Outfit type from shared schema but extend it for our needs
import { Outfit as BaseOutfit } from '@shared/schema';

// Extended outfit interface for magazine generation
interface Outfit extends BaseOutfit {
  pieces?: string[];
  reasoning?: string;
}
import OpenAI from 'openai';

// Initialize OpenAI with API key from environment variables
const openai = new OpenAI({ 
  apiKey: process.env.OPENAI_API_KEY || process.env.OPENAI_KEY 
});

// Template styles descriptions
const TEMPLATE_STYLES = {
  vogue: `Estilo Vogue: sofisticado, vanguardista, editorial. Utiliza frases cortas y potentes, 
          términos de moda elevados, y un tono que busca establecer tendencias. Referencias a diseñadores 
          de alta costura. Comentarios incisivos sobre tendencias.`,
  elle: `Estilo Elle: accesible pero elegante, práctico pero aspiracional. Tono amigable con consejos 
         útiles. Enfoque en cómo adaptar las tendencias a la vida cotidiana. Uso frecuente de listas 
         y consejos prácticos.`,
  bazaar: `Estilo Harper's Bazaar: lujoso, artístico, cultural. Referencias al arte y la historia 
           de la moda. Narrativa más extensa y elaborada. Tono intelectual pero accesible. 
           Descripciones detalladas de texturas y detalles.`,
  vanity: `Estilo Vanity Fair: narrativo, con contexto cultural. Conexiones entre moda y 
           tendencias sociales o culturales. Tono sofisticado pero conversacional. 
           Referencias a celebridades e influencias culturales.`,
  selene: `Estilo Selene Signature: exclusivo, atemporal y personalizado. Crea una narrativa única 
           para el lector. Tono íntimo que habla directamente al usuario. Combina elegancia 
           atemporal con toques contemporáneos. Referencias a la artesanía y detalles de calidad.`
};

interface MagazineGenerationRequest {
  outfits: Outfit[];
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
  outfits: Array<Outfit & { editorial: string }>;
  conclusion: string;
  template: string;
}

export async function generateMagazineContent(request: MagazineGenerationRequest): Promise<MagazineContent> {
  try {
    const { outfits, template, userPreferences, userName } = request;
    
    // Build editorial prompt based on template and outfits
    let prompt = `Eres un editor de revistas de moda de alto nivel. Crea contenido editorial para una revista de moda personalizada con el siguiente estilo:\n\n`;
    
    // Add template style information
    prompt += TEMPLATE_STYLES[template as keyof typeof TEMPLATE_STYLES] || TEMPLATE_STYLES.selene;
    
    // Add information about the outfits
    prompt += `\n\nLa revista destacará los siguientes outfits:\n`;
    outfits.forEach((outfit, i) => {
      prompt += `\nOutfit ${i+1}: "${outfit.name}"\n`;
      prompt += `Descripción: ${outfit.description}\n`;
      prompt += `Ocasión: ${outfit.occasion}\n`;
      if (outfit.season) prompt += `Temporada: ${outfit.season}\n`;
      if (outfit.pieces && outfit.pieces.length > 0) {
        prompt += `Piezas: ${outfit.pieces.join(', ')}\n`;
      }
    });
    
    // Add user preferences if available
    if (userPreferences) {
      prompt += `\nPreferencias del usuario:\n`;
      if (userPreferences.styles && userPreferences.styles.length > 0) {
        prompt += `Estilos preferidos: ${userPreferences.styles.join(', ')}\n`;
      }
      
      if (userPreferences.occasions && userPreferences.occasions.length > 0) {
        const highPriorityOccasions = userPreferences.occasions
          .filter(o => o.priority > 0.6)
          .map(o => o.name);
        if (highPriorityOccasions.length > 0) {
          prompt += `Ocasiones prioritarias: ${highPriorityOccasions.join(', ')}\n`;
        }
      }
      
      if (userPreferences.seasons && userPreferences.seasons.length > 0) {
        prompt += `Temporadas preferidas: ${userPreferences.seasons.join(', ')}\n`;
      }
    }
    
    // Instructions for content generation
    prompt += `\nGenera el siguiente contenido para la revista en español:
1. Un título atractivo para la revista
2. Un subtítulo complementario
3. Una introducción de aproximadamente 3-4 oraciones que presente el tema central de los outfits seleccionados
4. Para cada outfit, crea un texto editorial personalizado de aproximadamente 2-3 oraciones destacando su estilo y elementos únicos
5. Una conclusión de aproximadamente 2-3 oraciones que cierre la revista

Los textos deben seguir el estilo editorial especificado y hablar directamente al lector ${userName ? '(' + userName + ')' : ''}.
Por favor, formatea la respuesta como un objeto JSON con los campos: title, subtitle, introduction, outfits (array con los objetos originales más un campo editorial para cada uno), y conclusion.`;

    // Call OpenAI
    const response = await openai.chat.completions.create({
      model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
      messages: [
        {
          role: "system",
          content: "Eres un editor de moda profesional especializado en crear contenido editorial para revistas de moda de alta gama."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.7,
      response_format: { type: "json_object" }
    });

    // Parse the response
    const content = response.choices[0].message.content;
    if (!content) {
      throw new Error("No se recibió contenido de OpenAI");
    }
    
    const parsedContent = JSON.parse(content);
    
    // Format and return the magazine content
    const magazineContent: MagazineContent = {
      title: parsedContent.title,
      subtitle: parsedContent.subtitle,
      introduction: parsedContent.introduction,
      outfits: outfits.map((outfit, index) => ({
        ...outfit,
        editorial: parsedContent.outfits[index]?.editorial || 
                  `Este ${outfit.name} es perfecto para ${outfit.occasion}, combinando estilo y funcionalidad.`
      })),
      conclusion: parsedContent.conclusion,
      template
    };
    
    return magazineContent;
  } catch (error: any) {
    console.error("Error generando contenido de revista:", error);
    throw new Error(`Error al generar contenido de revista: ${error.message}`);
  }
}