import OpenAI from "openai";
import { cacheService } from "./cacheService";
import { log } from "../vite";
import { Garment } from "@shared/schema";

// Inicializar cliente de OpenAI
const openaiClient = new OpenAI({
  apiKey: process.env.FASHION_GEMINI_API_KEY || 'your_gemini_api_key',
});

// Función para generar imágenes
async function generateImageWithGemini(prompt: string): Promise<string> {
  if (!openaiClient) {
    throw new Error("Cliente de Gemini no disponible");
  }

  try {
    log("Generando imagen con Gemini...", "gemini");
    const result = await openaiClient.createImage({
      prompt: prompt,
      n: 1,
      size: "1024x1024", // tamaño seleccionado
    });

    const imageUrl = result.data[0].url;
    return imageUrl; // Devuelve la URL de la imagen generada
  } catch (error) {
    log(`Error en generación de imagen con Gemini: ${error}`, "gemini-error");
    throw new Error("No se pudo generar la imagen");
  }
}

export async function generateOutfitSuggestions(request: OutfitGenerationRequest): Promise<OutfitSuggestion[]> {
  try {
    // Obtener resultados de caché
    const cacheKey = cacheService.getOutfitsKey(request);
    const cachedResult = cacheService.get<OutfitSuggestion[]>(cacheKey);
    
    if (cachedResult) {
      log("Utilizando resultados en caché", "openai");
      return cachedResult;
    }

    const prompt = generateOutfitPrompt(request);
    const outfits = await generateOutfitContent(prompt); // Aquí llamamos al método de generación de contenido.

    // Generar imágenes para cada sugerencia de outfit
    for (const outfit of outfits) {
      outfit.image = await generateImageWithGemini(outfit.description);
    }

    // Guardar en caché
    cacheService.set(cacheKey, outfits);
    return outfits;
  } catch (error) {
    log(`Error en generación de outfits: ${error}`, "openai-error");
    throw error;  // Propagar el error
  }
}