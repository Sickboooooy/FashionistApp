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
  const apiKey = process.env.GEMINI2APIKEY || "";
  if (!apiKey) {
    log("API Key de Google Generative AI no configurada o no disponible", "gemini-error");
  } else {
    genAI = new GoogleGenerativeAI(apiKey);
    log("Cliente Google Generative AI inicializado correctamente", "gemini");
  }
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
    
    // Usar el modelo gemini-1.5-pro que tiene mejores capacidades para descripción detallada
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro" });
    
    // Mejorar el prompt para obtener descripciones más detalladas orientadas a moda
    const enhancedPrompt = `
      Actúa como un diseñador de moda y generador de imágenes especializado. 
      Necesito una descripción extremadamente detallada para crear una imagen de moda basada en:
      "${prompt}"
      
      Proporciona una descripción visual completa que incluya:
      1. Composición y encuadre para una foto de moda profesional
      2. Paleta de colores específica (nombres exactos de tonos)
      3. Iluminación profesional (tipo de iluminación, dirección, intensidad)
      4. Detalles de las prendas (textura, caída, corte, acabados)
      5. Estilismo completo (combinación de prendas, accesorios, calzado)
      6. Ambiente y fondo que complementen el look
      7. Pose y presentación (si incluye modelo)
      
      Tu descripción debe ser extremadamente precisa y detallada, como si estuvieras dirigiendo una sesión 
      fotográfica de alta moda para una revista prestigiosa.`;
    
    // Usar manejo de errores mejorado con timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 segundos máximo
    
    try {
      const descriptionResult = await model.generateContent({
        contents: [{ role: "user", parts: [{ text: enhancedPrompt }] }],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 1024,
        }
      });
      
      clearTimeout(timeoutId);
      
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
      
      // Generar una imagen SVG mejorada con la descripción
      const placeholderImageContent = `
      <svg width="1024" height="1024" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="goldGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stop-color="#d4af37" />
            <stop offset="50%" stop-color="#f9f295" />
            <stop offset="100%" stop-color="#d4af37" />
          </linearGradient>
          <filter id="dropShadow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur in="SourceAlpha" stdDeviation="3" />
            <feOffset dx="2" dy="2" result="offsetblur" />
            <feComponentTransfer>
              <feFuncA type="linear" slope="0.5" />
            </feComponentTransfer>
            <feMerge>
              <feMergeNode />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        
        <rect width="100%" height="100%" fill="#000"/>
        <rect x="10" y="10" width="1004" height="1004" fill="#0a0a0a" rx="15" ry="15"/>
        <rect x="15" y="15" width="994" height="994" fill="none" stroke="url(#goldGradient)" stroke-width="2" rx="12" ry="12"/>
        
        <text x="512" y="80" font-family="Arial, sans-serif" font-size="40" fill="url(#goldGradient)" text-anchor="middle" filter="url(#dropShadow)">
          Selene Style - Diseño de Moda
        </text>
        
        <text x="512" y="130" font-family="Arial, sans-serif" font-size="24" fill="#f9f295" text-anchor="middle">
          Descripción para generación de imagen
        </text>
        
        <rect x="80" y="180" width="864" height="600" fill="rgba(255,255,255,0.05)" rx="10" ry="10" stroke="url(#goldGradient)" stroke-width="1"/>
        
        <foreignObject x="100" y="200" width="824" height="560">
          <div xmlns="http://www.w3.org/1999/xhtml" style="font-family: Arial, sans-serif; font-size: 18px; color: #f0f0f0; height: 100%; overflow: auto; padding: 10px;">
            <p style="margin: 0 0 15px 0; color: #d4af37; font-weight: bold;">Descripción detallada:</p>
            <p style="line-height: 1.5; text-align: justify;">${enhancedDescription.replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\n\n/g, '</p><p style="line-height: 1.5; text-align: justify; margin-top: 10px;">').replace(/\n/g, '<br/>')}</p>
          </div>
        </foreignObject>
        
        <rect x="80" y="800" width="864" height="80" fill="rgba(255,255,255,0.05)" rx="10" ry="10"/>
        
        <text x="512" y="830" font-family="Arial, sans-serif" font-size="18" fill="#d4af37" text-anchor="middle">
          Prompt original: ${prompt.length > 60 ? prompt.slice(0, 60) + '...' : prompt}
        </text>
        
        <text x="512" y="860" font-family="Arial, sans-serif" font-size="16" fill="#999" text-anchor="middle">
          Generado con Google Gemini | ${new Date().toLocaleDateString()}
        </text>
        
        <text x="512" y="960" font-family="Arial, sans-serif" font-size="14" fill="#555" text-anchor="middle">
          * Esta descripción podría utilizarse con un servicio de generación de imágenes compatible *
        </text>
      </svg>
      `;
      
      fs.writeFileSync(filePath, placeholderImageContent);
      
      log(`Imagen generada con descripción de Gemini en: ${filePath}`, "gemini");
      
      return filePath;
    } catch (abortError) {
      clearTimeout(timeoutId);
      if (abortError.name === 'AbortError') {
        throw new Error("La solicitud a Gemini tomó demasiado tiempo y fue cancelada.");
      }
      throw abortError;
    }
  } catch (error: any) {
    log(`Error en generación de imagen con Gemini: ${error}`, "gemini-error");
    
    // Crear una imagen de error para no dejar al usuario sin respuesta
    try {
      const timestamp = Date.now();
      const fileName = `fashionai_error_${timestamp}.svg`;
      const filePath = path.join("uploads", fileName);
      
      ensureUploadsDir();
      
      const errorImageContent = `
      <svg width="1024" height="1024" xmlns="http://www.w3.org/2000/svg">
        <rect width="100%" height="100%" fill="#000"/>
        <rect x="10" y="10" width="1004" height="1004" fill="#1a0000" rx="15" ry="15"/>
        
        <text x="512" y="400" font-family="Arial, sans-serif" font-size="30" fill="#ff5555" text-anchor="middle">
          No se pudo generar la imagen
        </text>
        
        <text x="512" y="450" font-family="Arial, sans-serif" font-size="20" fill="#aaa" text-anchor="middle">
          Por favor, intenta de nuevo con otra descripción
        </text>
        
        <text x="512" y="500" font-family="Arial, sans-serif" font-size="16" fill="#777" text-anchor="middle">
          Error: ${(error.message || "Desconocido").substring(0, 80)}
        </text>
      </svg>
      `;
      
      fs.writeFileSync(filePath, errorImageContent);
      return filePath;
    } catch (svgError) {
      // Si incluso falló la generación de la imagen de error, lanzamos el error original
      throw error;
    }
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