import OpenAI from "openai";
import { ensureUploadsDir } from "./image-service";
import { v4 as uuidv4 } from "uuid";
import fs from "fs";
import path from "path";
import { cacheService } from "./cacheService";
import { log } from "../vite";
import { GoogleGenerativeAI } from "@google/generative-ai";

// Inicializar cliente de OpenAI
let openai: OpenAI | null = null;
try {
  openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });
  log("Cliente OpenAI inicializado correctamente para generación de imágenes", "openai");
} catch (error) {
  log(`Error al inicializar cliente OpenAI para generación de imágenes: ${error}`, "openai-error");
}

// Inicializar cliente de Google Gemini
let genAI: GoogleGenerativeAI | null = null;
try {
  genAI = new GoogleGenerativeAI(process.env.GEMINI2APIKEY || "");
  log("Cliente Google Generative AI inicializado correctamente", "gemini");
} catch (error) {
  log(`Error al inicializar cliente Google Generative AI: ${error}`, "gemini-error");
}

interface ImageGenerationOptions {
  prompt: string;
  style?: "vivid" | "natural"; // Estilo de la imagen: vívido o natural
  size?: "1024x1024" | "1792x1024" | "1024x1792"; // Tamaños disponibles
  quality?: "standard" | "hd"; // Calidad: estándar o alta definición
}

/**
 * Genera una imagen usando OpenAI DALL-E 3 con respaldo a Gemini
 */
export async function generateFashionImage(options: ImageGenerationOptions): Promise<string> {
  const { prompt, style = "vivid", size = "1024x1024", quality = "standard" } = options;
  
  // Crear prompt especializado en moda
  const enhancedPrompt = enhanceFashionPrompt(prompt);
  
  // Verificar si existe en caché
  const cacheKey = `image_gen_${enhancedPrompt}_${style}_${size}_${quality}`;
  const cachedResult = cacheService.get<string>(cacheKey);
  
  if (cachedResult) {
    log("Utilizando imagen generada de caché", "image-gen");
    return cachedResult;
  }
  
  try {
    // Verificar si tenemos cliente de OpenAI
    if (!openai) {
      log("Cliente OpenAI no disponible para generación de imágenes, intentando con Gemini", "openai-fallback");
      return await generateImageWithGemini(enhancedPrompt);
    }

    log("Generando imagen con DALL-E 3...", "image-gen");
    
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
    log(`Error generando imagen con DALL-E 3: ${error}. Intentando con Gemini como respaldo...`, "openai-error");
    
    try {
      // Intentar con Gemini como respaldo
      const localImagePath = await generateImageWithGemini(enhancedPrompt);
      
      // Guardar en caché
      cacheService.set(cacheKey, localImagePath);
      
      return localImagePath;
    } catch (geminiError: any) {
      log(`Error también en generación con Gemini: ${geminiError}`, "gemini-error");
      throw new Error("No se pudo generar la imagen con ningún proveedor disponible.");
    }
  }
}

/**
 * Genera imagen usando Google Gemini Pro Vision
 */
async function generateImageWithGemini(prompt: string): Promise<string> {
  if (!genAI) {
    throw new Error("Cliente de Google Generative AI no disponible");
  }
  
  try {
    log("Generando imagen con Gemini...", "gemini");
    
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    
    // Solicitar a Gemini que describa la imagen que debería generarse
    const descriptionResult = await model.generateContent(`
      Actúa como un generador de imágenes. Necesito una descripción extremadamente detallada para crear una imagen basada en:
      "${prompt}"
      
      Proporciona una descripción visual completa que incluya:
      1. Composición y encuadre
      2. Colores y paleta
      3. Iluminación y sombras
      4. Detalles de primer plano y fondo
      5. Textura y materiales
      6. Estilo y atmósfera
      
      Tu descripción será usada para generar una imagen de alta calidad, así que sé muy específico.`);
    
    const enhancedDescription = descriptionResult.response.text();
    
    // Generar un nombre de archivo descriptivo pero único
    const timestamp = Date.now();
    const fileName = `fashionai_gemini_${timestamp}.png`;
    const filePath = path.join("uploads", fileName);
    
    // Crear una imagen placeholder con un mensaje
    ensureUploadsDir();
    
    // Crear un archivo de texto con la descripción que sería usada para generar la imagen
    const descriptionFilePath = path.join("uploads", `${path.basename(fileName, '.png')}_description.txt`);
    fs.writeFileSync(descriptionFilePath, enhancedDescription);
    
    // Generar una imagen de placeholder que indique que Gemini solo generó una descripción
    // En un sistema real, esta descripción se enviaría a un generador de imágenes de terceros
    const placeholderImageContent = `
    <svg width="1024" height="1024" xmlns="http://www.w3.org/2000/svg">
      <rect width="100%" height="100%" fill="#000"/>
      <rect x="10" y="10" width="1004" height="1004" fill="#1a1a1a" rx="15" ry="15"/>
      
      <text x="512" y="100" font-family="Arial" font-size="40" fill="#d4af37" text-anchor="middle">Selene Style - Descripción de Moda</text>
      
      <text x="512" y="180" font-family="Arial" font-size="25" fill="#fff" text-anchor="middle">Gemini ha generado una descripción detallada</text>
      <text x="512" y="220" font-family="Arial" font-size="25" fill="#fff" text-anchor="middle">de cómo luciría esta imagen de moda.</text>
      
      <rect x="100" y="280" width="824" height="500" fill="rgba(255,255,255,0.1)" rx="10" ry="10"/>
      
      <foreignObject x="120" y="300" width="784" height="460">
        <div xmlns="http://www.w3.org/1999/xhtml" style="font-family: Arial; font-size: 18px; color: #d4af37; height: 100%; overflow: auto;">
          <p style="margin: 10px;">${enhancedDescription.replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\n/g, '<br/>')}</p>
        </div>
      </foreignObject>
      
      <text x="512" y="830" font-family="Arial" font-size="20" fill="#999" text-anchor="middle">Prompt original: ${prompt.slice(0, 50)}${prompt.length > 50 ? '...' : ''}</text>
      
      <text x="512" y="900" font-family="Arial" font-size="18" fill="#d4af37" text-anchor="middle">Generado con Google Gemini como respaldo</text>
      <text x="512" y="930" font-family="Arial" font-size="18" fill="#d4af37" text-anchor="middle">Fecha: ${new Date().toLocaleDateString()}</text>
    </svg>
    `;
    
    fs.writeFileSync(filePath, placeholderImageContent);
    
    log(`Imagen de respaldo generada con Gemini en: ${filePath}`, "gemini");
    
    return filePath;
  } catch (error: any) {
    log(`Error en generación de imagen con Gemini: ${error}`, "gemini-error");
    throw new Error("No se pudo generar la imagen con Gemini. " + (error.message || ""));
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
    log(`Error guardando imagen: ${error}`, "image-save-error");
    throw new Error("No se pudo guardar la imagen generada.");
  }
}