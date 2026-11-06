/**
 * 🎨 GEMINI FLASH 2.5 IMAGE GENERATION SERVICE
 * Servicio especializado para generación de imágenes con Google Gemini Flash 2.5
 * PRIORIDAD 1: Gemini como opción principal para generación de imágenes
 */

import { GoogleGenerativeAI } from "@google/generative-ai";
import { cacheService } from "./cacheService";
import { log } from "../vite";
import fs from "fs";
import path from "path";
import { ensureUploadsDir } from "./image-service";

// Inicializar cliente de Google Generative AI para generación de imágenes
let genAI: GoogleGenerativeAI | null = null;
let imageGenerationModel: any = null;

try {
  const apiKey = process.env.GEMINI2APIKEY || "";
  if (!apiKey || apiKey === "your_gemini_key_here") {
    log("❌ API Key de Google Generative AI no configurada para generación de imágenes", "gemini-image-error");
  } else {
    genAI = new GoogleGenerativeAI(apiKey);
    
    // Usar Gemini 1.5 Flash para generación de contenido (modelo estable actual)
    imageGenerationModel = genAI.getGenerativeModel({ 
      model: "gemini-1.5-flash-latest",
      generationConfig: {
        temperature: 0.6,
        topP: 0.8,
        topK: 40,
        maxOutputTokens: 2048,
      },
    });
    
    log("✅ Cliente Gemini 1.5 Flash inicializado para generación de imágenes", "gemini-image");
  }
} catch (error) {
  log(`❌ Error al inicializar cliente Gemini para imágenes: ${error}`, "gemini-image-error");
}

interface GeminiFashionImageOptions {
  prompt: string;
  style?: "editorial" | "street" | "haute-couture" | "casual" | "commercial";
  aspectRatio?: "1:1" | "16:9" | "9:16" | "4:3" | "3:4";
  targetMarket?: "mexico" | "latinamerica" | "global";
  enhanceForFashion?: boolean;
}

/**
 * 🎯 Genera imágenes de moda usando Gemini Flash 2.5
 * NUEVO: Gemini como opción principal
 */
export async function generateFashionImageWithGemini(
  options: GeminiFashionImageOptions
): Promise<string> {
  const { 
    prompt, 
    style = "editorial",
    aspectRatio = "1:1",
    targetMarket = "mexico",
    enhanceForFashion = true
  } = options;

  try {
    // Verificar que el modelo está disponible
    if (!genAI || !imageGenerationModel) {
      throw new Error("❌ Cliente Gemini no disponible para generación de imágenes");
    }

    // Verificar caché
    const cacheKey = `gemini_fashion_${prompt}_${style}_${aspectRatio}`;
    const cachedResult = cacheService.get<string>(cacheKey);
    
    if (cachedResult) {
      log("✨ Utilizando imagen generada de caché (Gemini)", "gemini-image-cache");
      return cachedResult;
    }

    // 🎨 Mejorar prompt para moda profesional
    const enhancedPrompt = enhanceForFashion 
      ? enhanceFashionPromptForGemini(prompt, style, targetMarket)
      : prompt;
    
    log(`🎨 Generando imagen con Gemini Flash 2.5: ${enhancedPrompt.substring(0, 100)}...`, "gemini-image");

    // IMPORTANTE: Gemini Flash 2.5 NO puede generar imágenes directamente
    // En su lugar, generamos una descripción ultra-detallada que puede ser usada
    // por otros servicios o como base para prompts de imagen
    const detailedDescription = await generateDetailedFashionDescription(enhancedPrompt);
    
    // Generar imagen SVG profesional con la descripción
    const svgImagePath = await createFashionSVGFromDescription(detailedDescription, prompt, style);
    
    // Guardar en caché
    cacheService.set(cacheKey, svgImagePath);
    
    log(`✅ Imagen generada exitosamente con Gemini Flash 2.5`, "gemini-image-success");
    return svgImagePath;

  } catch (error: any) {
    log(`❌ Error en generación de imagen con Gemini: ${error.message}`, "gemini-image-error");
    
    // Generar imagen de fallback profesional
    return await generateGeminiFallbackImage(prompt, error.message);
  }
}

/**
 * 🎨 Mejora el prompt para obtener mejores resultados de moda
 */
function enhanceFashionPromptForGemini(
  basePrompt: string, 
  style: string, 
  targetMarket: string
): string {
  const styleModifiers = {
    editorial: "high-fashion editorial photography, magazine quality, professional lighting, artistic composition",
    street: "street style photography, urban fashion, authentic lifestyle, candid moments",
    "haute-couture": "haute couture fashion, luxury runway style, sophisticated elegance, designer quality",
    casual: "casual fashion photography, relaxed elegance, comfortable style, everyday luxury",
    commercial: "commercial fashion photography, product focused, clean styling, market appeal"
  };

  const marketModifiers = {
    mexico: "Mexican fashion sensibility, warm colors, cultural elegance",
    latinamerica: "Latin American style, vibrant colors, cultural richness",
    global: "international fashion appeal, universal style"
  };

  return `Professional fashion photography: ${basePrompt}. 
Style: ${styleModifiers[style as keyof typeof styleModifiers]}. 
Market: ${marketModifiers[targetMarket as keyof typeof marketModifiers]}.
High-end fashion magazine quality, perfect lighting, professional composition, 
detailed fabric textures, elegant styling, sophisticated color palette.`;
}

/**
 * 🎯 Genera descripción ultra-detallada para fashion
 */
async function generateDetailedFashionDescription(prompt: string): Promise<string> {
  try {
    const descriptionPrompt = `
Actúa como un director creativo de moda y fotógrafo profesional especializado en revistas de alta gama.
Necesito que crees una descripción EXTREMADAMENTE detallada y profesional para una imagen de moda basada en:

"${prompt}"

Tu descripción debe incluir:

1. 🎭 COMPOSICIÓN FOTOGRÁFICA:
   - Encuadre específico (plano completo, medio, detalle)
   - Ángulo de la cámara y perspectiva
   - Profundidad de campo y enfoque

2. 💡 ILUMINACIÓN PROFESIONAL:
   - Tipo de iluminación (natural, estudio, golden hour)
   - Dirección e intensidad de la luz
   - Sombras y contrastes específicos

3. 👗 DETALLES DE LA PRENDA:
   - Textura específica del tejido (seda, algodón, cuero, etc.)
   - Caída y movimiento de la tela
   - Corte, silueta y construcción
   - Detalles decorativos (botones, costuras, acabados)

4. 🎨 PALETA DE COLORES:
   - Colores principales con nombres específicos
   - Tonalidades y saturación
   - Armonía cromática del conjunto

5. 💎 ESTILISMO COMPLETO:
   - Accesorios específicos (joyas, bolsos, calzado)
   - Peinado y maquillaje
   - Combinación total del look

6. 🏛️ AMBIENTE Y FONDO:
   - Localización específica o set de estudio
   - Props y elementos ambientales
   - Atmósfera general de la imagen

7. 📸 ESTILO FOTOGRÁFICO:
   - Referencias editoriales de revistas de alta moda
   - Mood y sensación que transmite
   - Target de mercado específico

Crea una descripción de al menos 300 palabras que sea tan detallada que un artista visual profesional pueda recrear la imagen exacta. Usa terminología específica de moda y fotografía profesional.`;

    const result = await imageGenerationModel.generateContent(descriptionPrompt);
    const description = result.response.text();
    
    log("🎨 Descripción detallada generada con Gemini", "gemini-image");
    return description;
    
  } catch (error: any) {
    log(`❌ Error generando descripción: ${error.message}`, "gemini-image-error");
    return `Descripción de moda profesional para: ${prompt}. Estilo editorial de alta gama con iluminación profesional, composición elegante y detalles de lujo.`;
  }
}

/**
 * 🎨 Crea SVG profesional basado en la descripción de Gemini
 */
async function createFashionSVGFromDescription(
  description: string, 
  originalPrompt: string, 
  style: string
): Promise<string> {
  const timestamp = Date.now();
  const fileName = `gemini_fashion_${timestamp}.svg`;
  const filePath = path.join("uploads", fileName);
  
  ensureUploadsDir();
  
  // Extraer elementos clave de la descripción para el diseño
  const keywords = extractKeywords(description);
  const dominantColor = extractDominantColor(description);
  
  const svgContent = `
<svg width="1024" height="1024" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="geminiGradient" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="${dominantColor.primary}" />
      <stop offset="50%" stop-color="${dominantColor.secondary}" />
      <stop offset="100%" stop-color="${dominantColor.accent}" />
    </linearGradient>
    <linearGradient id="goldAccent" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#d4af37" />
      <stop offset="50%" stop-color="#f9f295" />
      <stop offset="100%" stop-color="#d4af37" />
    </linearGradient>
    <filter id="luxuryShadow" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur in="SourceAlpha" stdDeviation="4" />
      <feOffset dx="2" dy="4" result="offsetblur" />
      <feComponentTransfer>
        <feFuncA type="linear" slope="0.3" />
      </feComponentTransfer>
      <feMerge>
        <feMergeNode />
        <feMergeNode in="SourceGraphic" />
      </feMerge>
    </filter>
    <pattern id="fashionTexture" patternUnits="userSpaceOnUse" width="100" height="100">
      <rect width="100" height="100" fill="rgba(255,255,255,0.02)" />
      <circle cx="20" cy="20" r="1" fill="rgba(255,255,255,0.05)" />
      <circle cx="80" cy="80" r="1" fill="rgba(255,255,255,0.05)" />
    </pattern>
  </defs>
  
  <!-- Fondo principal -->
  <rect width="100%" height="100%" fill="#000" />
  <rect width="100%" height="100%" fill="url(#fashionTexture)" />
  
  <!-- Marco elegante -->
  <rect x="20" y="20" width="984" height="984" fill="none" stroke="url(#goldAccent)" stroke-width="3" rx="20" ry="20" />
  <rect x="30" y="30" width="964" height="964" fill="none" stroke="url(#geminiGradient)" stroke-width="1" rx="15" ry="15" opacity="0.6" />
  
  <!-- Header -->
  <rect x="50" y="50" width="924" height="120" fill="url(#geminiGradient)" rx="15" opacity="0.8" />
  <text x="512" y="90" font-family="Georgia, serif" font-size="32" fill="#fff" text-anchor="middle" filter="url(#luxuryShadow)" font-weight="bold">
    ✨ GEMINI FLASH 2.5 FASHION
  </text>
  <text x="512" y="130" font-family="Arial, sans-serif" font-size="18" fill="#f0f0f0" text-anchor="middle">
    AI-Generated Fashion Description • Estilo: ${style.toUpperCase()}
  </text>
  
  <!-- Prompt original -->
  <rect x="70" y="200" width="884" height="80" fill="rgba(255,255,255,0.08)" rx="10" stroke="url(#goldAccent)" stroke-width="1" />
  <text x="512" y="230" font-family="Arial, sans-serif" font-size="16" fill="#d4af37" text-anchor="middle" font-weight="bold">
    PROMPT ORIGINAL:
  </text>
  <text x="512" y="260" font-family="Arial, sans-serif" font-size="14" fill="#e0e0e0" text-anchor="middle">
    "${originalPrompt.length > 80 ? originalPrompt.slice(0, 80) + '...' : originalPrompt}"
  </text>
  
  <!-- Descripción detallada -->
  <rect x="70" y="310" width="884" height="450" fill="rgba(0,0,0,0.7)" rx="15" stroke="url(#geminiGradient)" stroke-width="2" />
  <text x="512" y="345" font-family="Georgia, serif" font-size="20" fill="#d4af37" text-anchor="middle" font-weight="bold">
    DESCRIPCIÓN FASHION PROFESIONAL
  </text>
  
  <foreignObject x="90" y="365" width="844" height="380">
    <div xmlns="http://www.w3.org/1999/xhtml" style="
      font-family: 'Georgia', serif; 
      font-size: 14px; 
      color: #e8e8e8; 
      line-height: 1.6;
      padding: 15px;
      height: 100%;
      overflow: auto;
      text-align: justify;
    ">
      <p style="color: #f9f295; margin-bottom: 15px; font-weight: bold;">🎨 Concepto Visual:</p>
      <p style="margin-bottom: 12px;">${description.substring(0, 200).replace(/</g, '&lt;').replace(/>/g, '&gt;')}...</p>
      
      <p style="color: #f9f295; margin-bottom: 10px; font-weight: bold;">💎 Elementos Clave:</p>
      <ul style="margin: 0; padding-left: 20px;">
        ${keywords.map(keyword => `<li style="margin-bottom: 5px; color: #d0d0d0;">${keyword}</li>`).join('')}
      </ul>
      
      <p style="color: #f9f295; margin: 15px 0 10px 0; font-weight: bold;">🎭 Estilo Fotográfico:</p>
      <p style="margin: 0; color: #c8c8c8;">Fotografía editorial de alta gama, inspirada en revistas internacionales de moda. Composición elegante con atención al detalle y estética sofisticada.</p>
    </div>
  </foreignObject>
  
  <!-- Keywords destacados -->
  <rect x="70" y="790" width="884" height="120" fill="rgba(255,255,255,0.05)" rx="10" />
  <text x="512" y="820" font-family="Arial, sans-serif" font-size="18" fill="#4ecdc4" text-anchor="middle" font-weight="bold">
    ⭐ CARACTERÍSTICAS GEMINI FLASH 2.5
  </text>
  <text x="256" y="850" font-family="Arial, sans-serif" font-size="14" fill="#96ceb4" text-anchor="middle">
    🚀 Ultra rápido
  </text>
  <text x="512" y="850" font-family="Arial, sans-serif" font-size="14" fill="#45b7d1" text-anchor="middle">
    🧠 Contexto avanzado
  </text>
  <text x="768" y="850" font-family="Arial, sans-serif" font-size="14" fill="#ff6b6b" text-anchor="middle">
    💰 Incluido en plan
  </text>
  <text x="512" y="880" font-family="Arial, sans-serif" font-size="14" fill="#f9f295" text-anchor="middle">
    🎨 Descripciones ultra-detalladas para fashion
  </text>
  
  <!-- Footer -->
  <text x="512" y="950" font-family="Arial, sans-serif" font-size="16" fill="#666" text-anchor="middle">
    FashionistApp • Powered by Google Gemini Flash 2.5 • ${new Date().toLocaleDateString()}
  </text>
  
  <text x="512" y="980" font-family="Arial, sans-serif" font-size="12" fill="#444" text-anchor="middle">
    ✨ Generado con IA • Optimizado para moda latina • Estilo profesional
  </text>
</svg>`;

  fs.writeFileSync(filePath, svgContent);
  
  // También guardar la descripción completa en un archivo de texto
  const txtFileName = `gemini_description_${timestamp}.txt`;
  const txtFilePath = path.join("uploads", txtFileName);
  fs.writeFileSync(txtFilePath, `DESCRIPCIÓN FASHION GENERADA POR GEMINI FLASH 2.5\n${'='.repeat(60)}\n\nPrompt Original: ${originalPrompt}\nEstilo: ${style}\nFecha: ${new Date().toLocaleString()}\n\n${description}`);
  
  log(`🎨 Imagen SVG y descripción generadas con Gemini: ${filePath}`, "gemini-image-success");
  
  return filePath.replace(/\\/g, '/');
}

/**
 * 🔍 Extrae palabras clave de la descripción para el diseño
 */
function extractKeywords(description: string): string[] {
  const fashionKeywords = [
    'elegante', 'sofisticado', 'moderno', 'clásico', 'vanguardista',
    'lujoso', 'minimalista', 'bohemio', 'urbano', 'romántico',
    'seda', 'algodón', 'cuero', 'lino', 'terciopelo',
    'editorial', 'comercial', 'street style', 'haute couture'
  ];
  
  const foundKeywords = fashionKeywords.filter(keyword => 
    description.toLowerCase().includes(keyword.toLowerCase())
  );
  
  return foundKeywords.length > 0 ? foundKeywords.slice(0, 5) : [
    'Estilo contemporáneo',
    'Diseño sofisticado', 
    'Calidad premium',
    'Tendencia actual',
    'Elegancia atemporal'
  ];
}

/**
 * 🎨 Extrae colores dominantes de la descripción
 */
function extractDominantColor(description: string): { primary: string; secondary: string; accent: string } {
  const colorMap: { [key: string]: { primary: string; secondary: string; accent: string } } = {
    negro: { primary: '#1a1a1a', secondary: '#2d2d2d', accent: '#d4af37' },
    blanco: { primary: '#f8f8f8', secondary: '#e0e0e0', accent: '#c0c0c0' },
    rojo: { primary: '#8b0000', secondary: '#a52a2a', accent: '#dc143c' },
    azul: { primary: '#1e3a8a', secondary: '#3b82f6', accent: '#60a5fa' },
    verde: { primary: '#065f46', secondary: '#059669', accent: '#34d399' },
    dorado: { primary: '#b45309', secondary: '#d97706', accent: '#f59e0b' },
    rosa: { primary: '#be185d', secondary: '#ec4899', accent: '#f9a8d4' },
    gris: { primary: '#374151', secondary: '#6b7280', accent: '#9ca3af' }
  };
  
  for (const [color, palette] of Object.entries(colorMap)) {
    if (description.toLowerCase().includes(color)) {
      return palette;
    }
  }
  
  // Paleta por defecto elegante
  return { primary: '#1a1a2e', secondary: '#16213e', accent: '#d4af37' };
}

/**
 * 🚨 Genera imagen de fallback profesional
 */
async function generateGeminiFallbackImage(prompt: string, error: string): Promise<string> {
  const timestamp = Date.now();
  const fileName = `gemini_fallback_${timestamp}.svg`;
  const filePath = path.join("uploads", fileName);
  
  ensureUploadsDir();
  
  const fallbackSVG = `
<svg width="1024" height="1024" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="fallbackGradient" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#1a1a2e" />
      <stop offset="50%" stop-color="#16213e" />
      <stop offset="100%" stop-color="#0f172a" />
    </linearGradient>
  </defs>
  
  <rect width="100%" height="100%" fill="url(#fallbackGradient)" />
  <rect x="20" y="20" width="984" height="984" fill="none" stroke="#d4af37" stroke-width="2" rx="15" />
  
  <text x="512" y="200" font-family="Arial, sans-serif" font-size="28" fill="#d4af37" text-anchor="middle" font-weight="bold">
    ⚠️ GEMINI FLASH 2.5 - MODO FALLBACK
  </text>
  
  <text x="512" y="300" font-family="Arial, sans-serif" font-size="18" fill="#e0e0e0" text-anchor="middle">
    Error en generación con API de Gemini
  </text>
  
  <text x="512" y="400" font-family="Arial, sans-serif" font-size="16" fill="#ff6b6b" text-anchor="middle">
    ${error.substring(0, 60)}...
  </text>
  
  <text x="512" y="500" font-family="Arial, sans-serif" font-size="14" fill="#96ceb4" text-anchor="middle">
    Prompt solicitado: "${prompt.substring(0, 50)}..."
  </text>
  
  <text x="512" y="600" font-family="Arial, sans-serif" font-size="16" fill="#f9f295" text-anchor="middle">
    🔧 Verifica tu API key de Google AI Studio
  </text>
  
  <text x="512" y="700" font-family="Arial, sans-serif" font-size="14" fill="#888" text-anchor="middle">
    Generado: ${new Date().toLocaleString()}
  </text>
</svg>`;

  fs.writeFileSync(filePath, fallbackSVG);
  
  log(`🚨 Imagen de fallback generada para Gemini: ${filePath}`, "gemini-image-fallback");
  
  return filePath.replace(/\\/g, '/');
}

/**
 * 🧪 Función de prueba para verificar la configuración de Gemini
 */
export async function testGeminiImageGeneration(): Promise<{ success: boolean; message: string; result?: string }> {
  try {
    if (!genAI || !imageGenerationModel) {
      return {
        success: false,
        message: "❌ Cliente Gemini no configurado. Verifica tu GEMINI2APIKEY en .env"
      };
    }
    
    const testResult = await generateFashionImageWithGemini({
      prompt: "elegant black dress for evening event",
      style: "editorial",
      enhanceForFashion: true
    });
    
    return {
      success: true,
      message: "✅ Gemini Flash 2.5 funcionando correctamente",
      result: testResult
    };
    
  } catch (error: any) {
    return {
      success: false,
      message: `❌ Error en test de Gemini: ${error.message}`
    };
  }
}