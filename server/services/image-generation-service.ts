import OpenAI from "openai";
import { ensureUploadsDir } from "./image-service";
import { v4 as uuidv4 } from "uuid";
import fs from "fs";
import path from "path";
import { cacheService } from "./cacheService";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user

interface ImageGenerationOptions {
  prompt: string;
  style?: "vivid" | "natural"; // Estilo de la imagen: vívido o natural
  size?: "1024x1024" | "1792x1024" | "1024x1792"; // Tamaños disponibles
  quality?: "standard" | "hd"; // Calidad: estándar o alta definición
}

/**
 * Genera una imagen usando OpenAI DALL-E 3 y devuelve la URL local
 */
export async function generateFashionImage(options: ImageGenerationOptions): Promise<string> {
  const { prompt, style = "vivid", size = "1024x1024", quality = "standard" } = options;
  
  // Crear prompt especializado en moda
  const enhancedPrompt = enhanceFashionPrompt(prompt);
  
  // Verificar si existe en caché
  const cacheKey = `image_gen_${enhancedPrompt}_${style}_${size}_${quality}`;
  const cachedResult = cacheService.get<string>(cacheKey);
  
  if (cachedResult) {
    return cachedResult;
  }
  
  try {
    // Generar imagen con DALL-E 3
    const response = await openai.images.generate({
      model: "dall-e-3",
      prompt: enhancedPrompt,
      n: 1,
      size: size,
      quality: quality,
      style: style,
    });
    
    // Guardar imagen
    const imageUrl = response.data[0].url;
    if (!imageUrl) {
      throw new Error("No se recibió URL de imagen de OpenAI");
    }
    
    const localImagePath = await saveImageFromUrl(imageUrl);
    
    // Guardar en caché
    cacheService.set(cacheKey, localImagePath);
    
    return localImagePath;
  } catch (error: any) {
    console.error("Error generando imagen de moda:", error);
    throw new Error("No se pudo generar la imagen. " + (error.message || ""));
  }
}

/**
 * Mejora un prompt para generar imágenes de moda de alta calidad
 */
function enhanceFashionPrompt(basePrompt: string): string {
  // Añadimos contexto y detalles para mejorar la calidad
  return `Imagen profesional de moda de alta calidad: ${basePrompt}. 
  Estilo de fotografía profesional, iluminación perfecta, composición elegante, 
  detalles nítidos, fondo estético que complementa la prenda.`;
}

/**
 * Guarda una imagen desde una URL externa
 */
async function saveImageFromUrl(url: string): Promise<string> {
  try {
    // Asegurar que existe el directorio de uploads
    ensureUploadsDir();
    
    // Obtener la imagen
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Error descargando imagen: ${response.statusText}`);
    
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    
    // Generar nombre de archivo único
    const fileName = `fashionai_${uuidv4()}.png`;
    const filePath = path.join("uploads", fileName);
    
    // Guardar archivo
    fs.writeFileSync(filePath, buffer);
    
    return filePath;
  } catch (error: any) {
    console.error("Error guardando imagen:", error);
    throw new Error("No se pudo guardar la imagen generada.");
  }
}