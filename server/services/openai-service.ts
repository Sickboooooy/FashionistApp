import OpenAI from "openai";
import { Garment } from "@shared/schema";

// Initialize OpenAI with API key from environment variables
const openai = new OpenAI({ 
  apiKey: process.env.OPENAI_API_KEY || process.env.OPENAI_KEY 
});

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

// Generate outfit suggestions using GPT-4o
export async function generateOutfitSuggestions(request: OutfitGenerationRequest): Promise<OutfitSuggestion[]> {
  try {
    // Build a detailed prompt based on the request
    let prompt = "You are a professional fashion stylist for FashionistApp, create outfit suggestions based on the following information:\n\n";
    
    // If garments are provided, include them in the prompt
    if (request.garments && request.garments.length > 0) {
      prompt += "Available garments:\n";
      request.garments.forEach(garment => {
        prompt += `- ${garment.name}: ${garment.type}, ${garment.color || 'unknown color'}${garment.pattern ? ', ' + garment.pattern : ''}, suitable for ${garment.season || 'any season'}\n`;
      });
    }
    
    // If user preferences are provided
    if (request.preferences) {
      if (request.preferences.styles && request.preferences.styles.length > 0) {
        prompt += "\nPreferred styles: " + request.preferences.styles.join(", ") + "\n";
      }
      
      if (request.preferences.occasions && request.preferences.occasions.length > 0) {
        const highPriorityOccasions = request.preferences.occasions
          .filter(o => o.priority > 0.6)
          .map(o => o.name);
        if (highPriorityOccasions.length > 0) {
          prompt += "\nHigh priority occasions: " + highPriorityOccasions.join(", ") + "\n";
        }
      }
      
      if (request.preferences.seasons && request.preferences.seasons.length > 0) {
        prompt += "\nPreferred seasons: " + request.preferences.seasons.join(", ") + "\n";
      }
    }
    
    // If text prompt is provided
    if (request.textPrompt) {
      prompt += `\nUser's specific request: "${request.textPrompt}"\n`;
    }
    
    // If specific occasion or season is requested
    if (request.occasion) {
      prompt += `\nTargeted occasion: ${request.occasion}\n`;
    }
    
    if (request.season) {
      prompt += `\nTargeted season: ${request.season}\n`;
    }
    
    // Instructions for response format
    prompt += `\nPlease generate 3 outfit suggestions. For each outfit, provide:
1. A creative name for the outfit
2. A detailed description of the complete outfit
3. The most suitable occasion
4. The appropriate season
5. A list of individual pieces that make up the outfit
6. A brief explanation of why these pieces work well together

Format your response as a JSON array with objects containing fields: name, description, occasion, season, pieces (array), and reasoning.`;

    // Call OpenAI API
    const response = await openai.chat.completions.create({
      model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
      messages: [
        {
          role: "system",
          content: "You are a professional fashion stylist with expertise in creating sophisticated, elegant outfits. You specialize in luxury fashion with a French elegant aesthetic."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.7,
      response_format: { type: "json_object" }
    });

    // Parse and return the suggestions
    const content = response.choices[0].message.content;
    if (!content) {
      throw new Error("No content received from OpenAI");
    }
    
    const parsedContent = JSON.parse(content);
    return parsedContent.suggestions || [];
  } catch (error) {
    console.error("Error generating outfit suggestions:", error);
    throw new Error(`Failed to generate outfit suggestions: ${error.message}`);
  }
}

// Analyze uploaded image of garment
export async function analyzeGarmentImage(base64Image: string): Promise<Partial<Garment>> {
  try {
    const prompt = "Analyze this clothing item image and provide detailed information about it. " +
                   "Determine the type of garment (e.g., shirt, pants, dress), color, pattern (if any), " +
                   "material (if identifiable), and suitable seasons. " +
                   "Format response as JSON with fields: name, type, color, pattern, season";

    const response = await openai.chat.completions.create({
      model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
      messages: [
        {
          role: "system",
          content: "You are a fashion expert specializing in garment identification and categorization."
        },
        {
          role: "user",
          content: [
            { type: "text", text: prompt },
            {
              type: "image_url",
              image_url: {
                url: `data:image/jpeg;base64,${base64Image}`
              }
            }
          ]
        }
      ],
      temperature: 0.3,
      response_format: { type: "json_object" }
    });

    const content = response.choices[0].message.content;
    if (!content) {
      throw new Error("No content received from OpenAI");
    }
    
    return JSON.parse(content);
  } catch (error) {
    console.error("Error analyzing garment image:", error);
    throw new Error(`Failed to analyze garment image: ${error.message}`);
  }
}
