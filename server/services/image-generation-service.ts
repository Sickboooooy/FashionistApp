import { ensureUploadsDir } from "./image-service";
import fs from "fs";
import path from "path";
import { cacheService } from "./cacheService";
import { log } from "../vite";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { generateFashionImageWithReplicate } from "./replicate-service"; // 🚀 NUEVA JOYA DE LA CORONA
import { 
  generateMagazineStylePrompt, 
  generateSmartPrompt, 
  optimizeForLatinMarket,
  FashionContext 
} from "./fashion-prompt-generator"; // 🎨 SISTEMA DE PROMPTS PROFESIONAL

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
  
  // 🎨 NUEVAS OPCIONES PARA MODA PROFESIONAL
  fashionContext?: FashionContext; // Contexto de moda para prompts especializados
  targetMarket?: "mexico" | "latinamerica" | "global"; // Mercado objetivo
  useSmartPrompts?: boolean; // Usar sistema inteligente de prompts
}

/**
 * Genera una imagen usando REPLICATE + FLUX como primera opción (ECONOMICO Y POTENTE!)
 * Fallback a Gemini si falla
 * 🎨 AHORA CON PROMPTS PROFESIONALES ESTILO REVISTA!
 */
export async function generateFashionImage(options: ImageGenerationOptions): Promise<string> {
  const { 
    prompt, 
    style = "vivid", 
    size = "1024x1024", 
    quality = "standard",
    fashionContext = {},
    targetMarket = "mexico",
    useSmartPrompts = true
  } = options;
  
  // 🎯 GENERAR PROMPT PROFESIONAL ESTILO REVISTA
  let enhancedPrompt: string;
  
  if (useSmartPrompts) {
    log("🎨 Generando prompt profesional estilo revista...", "fashion-prompt");
    
    // Configurar contexto por defecto para mercado mexicano
    const defaultContext: FashionContext = {
      magazineStyle: "vogue",
      shootType: "editorial", 
      targetMarket: targetMarket,
      model: "female", // Se puede inferir del prompt
      ...fashionContext
    };
    
    // Generar prompt inteligente
    const keywords = prompt.toLowerCase().split(' ');
    enhancedPrompt = generateSmartPrompt(keywords, defaultContext);
    
    // Optimizar para mercado latino si es necesario
    if (targetMarket === "mexico" || targetMarket === "latinamerica") {
      enhancedPrompt = optimizeForLatinMarket(enhancedPrompt);
    }
    
    log(`🎯 Prompt optimizado: ${enhancedPrompt.substring(0, 150)}...`, "fashion-prompt");
  } else {
    // Usar el método simple anterior
    enhancedPrompt = enhanceFashionPrompt(prompt);
  }
  
  // Verificar si existe en caché
  const cacheKey = `fashion_image_${enhancedPrompt}_${style}_${size}_${quality}`;
  const cachedResult = cacheService.get<string>(cacheKey);
  
  if (cachedResult) {
    log("✨ Utilizando imagen generada de caché", "image-gen");
    return cachedResult;
  }
  
  // 🚀 PRIMERA OPCIÓN: REPLICATE + FLUX (Ultra económico!)
  try {
    log("🚀 Intentando generación con Replicate FLUX (económico)...", "replicate");
    
    // Mapear tamaño a aspect ratio
    const aspectRatio = size === "1792x1024" ? "16:9" : 
                       size === "1024x1792" ? "9:16" : "1:1";
    
    const localImagePath = await generateFashionImageWithReplicate({
      prompt: enhancedPrompt,
      model: "flux-schnell", // El más rápido y barato
      aspectRatio,
      outputFormat: "jpg",
      outputQuality: quality === "hd" ? 95 : 85
    });
    
    // Guardar en caché
    cacheService.set(cacheKey, localImagePath);
    
    log("🎉 Imagen generada exitosamente con Replicate FLUX!", "replicate-success");
    return localImagePath;
    
  } catch (replicateError: any) {
    log(`⚠️  Replicate falló: ${replicateError.message}. Fallback a Gemini...`, "replicate-warning");
    
    // 🔄 FALLBACK: Gemini (modo descripción)
    try {
      log("🔄 Generando con Gemini como fallback...", "gemini");
      const localImagePath = await generateImageWithGemini(enhancedPrompt);
      
      // Guardar en caché
      cacheService.set(cacheKey, localImagePath);
      
      return localImagePath;
    } catch (geminiError: any) {
      log(`❌ Error en generación de imagen con Gemini: ${geminiError}`, "gemini-error");
      throw new Error("No se pudo generar la imagen con ningún proveedor. Verifica tus API keys y vuelve a intentarlo.");
    }
  }
}

/**
 * Genera imagen usando Google Gemini
 */
async function generateImageWithGemini(prompt: string): Promise<string> {
  if (!genAI) {
    throw new Error("Cliente de Google Generative AI no disponible");
  }
  
  try {
    log("Generando imagen con Gemini...", "gemini");
    
    // Usar el modelo gemini-2.5-flash que es más rápido y adecuado para descripciones
    const model = genAI.getGenerativeModel({ 
      model: "models/gemini-2.5-flash",
      generationConfig: {
        temperature: 0.7,
        topP: 0.9,
        maxOutputTokens: 1024,
      }
    });
    
    // Mejorar el prompt para obtener descripciones más detalladas orientadas a moda
    const enhancedPrompt = `
      Actúa como un diseñador de moda profesional y generador de imágenes especializado. 
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
      });
      
      clearTimeout(timeoutId);
      
      const enhancedDescription = descriptionResult.response.text();
      
      // Generar un nombre de archivo descriptivo pero único
      const timestamp = Date.now();
      const fileName = `fashionai_gemini_${timestamp}.svg`;
      const filePath = path.join("uploads", fileName);
      
      // Crear una imagen placeholder con un mensaje
      ensureUploadsDir();
      
      // Crear un archivo de texto con la descripción que sería usada para generar la imagen
      const descriptionFilePath = path.join("uploads", `${path.basename(fileName, '.svg')}_description.txt`);
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
          Selene Style - Diseño de Moda con Gemini
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
          * Imagen generada exclusivamente con Gemini *
        </text>
      </svg>
      `;
      
      fs.writeFileSync(filePath, placeholderImageContent);
      
      log(`Imagen generada con descripción de Gemini en: ${filePath}`, "gemini");
      
      return filePath;
    } catch (error: unknown) {
      clearTimeout(timeoutId);
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error("La solicitud a Gemini tomó demasiado tiempo y fue cancelada.");
      }
      throw error;
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
          No se pudo generar la imagen con Gemini
        </text>
        
        <text x="512" y="450" font-family="Arial, sans-serif" font-size="20" fill="#aaa" text-anchor="middle">
          Por favor, verifica tu API key y vuelve a intentarlo
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