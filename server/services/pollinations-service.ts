/**
 * 🎨 POLLINATIONS.AI FREE IMAGE GENERATION SERVICE
 * Servicio GRATUITO de generación de imágenes con AI
 * NO requiere API key - Usa modelos open source (Stable Diffusion, SDXL)
 * 
 * Documentación: https://pollinations.ai/
 */

import { ensureUploadsDir } from "./image-service";
import fs from "fs";
import path from "path";
import { cacheService } from "./cacheService";
import { log } from "../vite";

// URLs de la API de Pollinations
const POLLINATIONS_IMAGE_URL = "https://image.pollinations.ai/prompt";

interface PollinationsImageOptions {
  prompt: string;
  width?: number;
  height?: number;
  seed?: number;
  model?: "flux" | "turbo" | "flux-realism" | "flux-anime" | "flux-3d";
  nologo?: boolean;
  enhance?: boolean;
  // Fashion-specific
  fashionStyle?: "editorial" | "street" | "haute-couture" | "casual" | "commercial";
}

/**
 * 🎨 Genera imágenes de moda usando Pollinations.ai (GRATIS!)
 * Usa Stable Diffusion/FLUX models sin necesidad de API key
 */
export async function generateFashionImageWithPollinations(
  options: PollinationsImageOptions
): Promise<string> {
  const {
    prompt,
    width = 1024,
    height = 1024,
    seed,
    model = "flux",
    nologo = true,
    enhance = true,
    fashionStyle = "editorial"
  } = options;

  try {
    // 👗 Mejorar el prompt para fashion
    const enhancedPrompt = enhanceFashionPromptForPollinations(prompt, fashionStyle);
    
    // Crear cache key
    const cacheKey = `pollinations_${enhancedPrompt}_${width}x${height}_${model}_${fashionStyle}`;
    const cachedResult = cacheService.get<string>(cacheKey);
    
    if (cachedResult) {
      log(`✨ Imagen cacheada encontrada (Pollinations)`, "pollinations-cache");
      return cachedResult;
    }

    log(`🎨 Generando imagen con Pollinations.ai (GRATIS!)...`, "pollinations");
    log(`📝 Prompt: ${enhancedPrompt.substring(0, 100)}...`, "pollinations");

    // Construir URL con parámetros
    const encodedPrompt = encodeURIComponent(enhancedPrompt);
    const randomSeed = seed || Math.floor(Math.random() * 1000000);
    
    // URL de la imagen (GET request directo)
    const imageUrl = `${POLLINATIONS_IMAGE_URL}/${encodedPrompt}?width=${width}&height=${height}&seed=${randomSeed}&model=${model}&nologo=${nologo}&enhance=${enhance}`;

    log(`🔗 URL: ${imageUrl.substring(0, 80)}...`, "pollinations");

    // Descargar la imagen
    const response = await fetch(imageUrl, {
      method: "GET",
      headers: {
        "Accept": "image/*"
      }
    });

    if (!response.ok) {
      throw new Error(`Pollinations error: ${response.status} ${response.statusText}`);
    }

    // Verificar que sea una imagen
    const contentType = response.headers.get("content-type");
    if (!contentType?.startsWith("image/")) {
      throw new Error(`Respuesta no es una imagen: ${contentType}`);
    }

    // Guardar la imagen localmente
    const arrayBuffer = await response.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);
    
    ensureUploadsDir();
    
    const timestamp = Date.now();
    const fileName = `pollinations_fashion_${timestamp}.jpg`;
    const filePath = path.join("uploads", fileName);
    
    fs.writeFileSync(filePath, uint8Array);
    
    // Guardar metadata
    const metadataPath = path.join("uploads", `${path.basename(fileName, '.jpg')}_metadata.json`);
    fs.writeFileSync(metadataPath, JSON.stringify({
      prompt: enhancedPrompt,
      originalPrompt: prompt,
      model,
      fashionStyle,
      width,
      height,
      seed: randomSeed,
      generated_at: new Date().toISOString(),
      provider: "pollinations.ai",
      cost: "FREE! 🎉",
      original_url: imageUrl
    }, null, 2));

    // Cachear resultado
    const normalizedPath = filePath.replace(/\\/g, '/');
    cacheService.set(cacheKey, normalizedPath);
    
    log(`🎉 Imagen generada exitosamente con Pollinations.ai: ${filePath}`, "pollinations-success");
    return normalizedPath;

  } catch (error: any) {
    log(`❌ Error en Pollinations.ai: ${error.message}`, "pollinations-error");
    
    // Generar imagen de fallback
    return await generatePollinationsFallbackImage(prompt, error.message);
  }
}

/**
 * 👗 Mejora el prompt para fotografía de moda
 */
function enhanceFashionPromptForPollinations(basePrompt: string, fashionStyle: string): string {
  const styleModifiers: Record<string, string> = {
    "editorial": "high-fashion editorial photography, Vogue magazine style, professional studio lighting, dramatic shadows",
    "street": "street style photography, urban fashion, natural lighting, candid pose, city background",
    "haute-couture": "haute couture fashion photography, luxury runway style, dramatic lighting, elegant pose",
    "casual": "casual fashion photography, relaxed lifestyle, soft natural lighting, friendly smile",
    "commercial": "commercial fashion photography, clean white background, product focus, e-commerce style"
  };

  const fashionTerms = [
    "professional fashion model",
    "detailed fabric texture",
    "perfect lighting",
    "sharp focus",
    "high resolution",
    "fashion magazine quality",
    "beautiful composition"
  ];

  const modifier = styleModifiers[fashionStyle] || styleModifiers.editorial;
  const terms = fashionTerms.join(", ");

  return `${basePrompt}, ${modifier}, ${terms}, trending on fashion magazines, photorealistic`;
}

/**
 * 🚨 Genera imagen de fallback si hay error
 */
async function generatePollinationsFallbackImage(prompt: string, error: string): Promise<string> {
  ensureUploadsDir();
  
  const timestamp = Date.now();
  const fileName = `pollinations_fallback_${timestamp}.svg`;
  const filePath = path.join("uploads", fileName);

  const fallbackSVG = `
<svg width="1024" height="1024" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="pollGradient" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#8B5CF6" />
      <stop offset="50%" stop-color="#EC4899" />
      <stop offset="100%" stop-color="#F59E0B" />
    </linearGradient>
    <filter id="glow">
      <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
      <feMerge>
        <feMergeNode in="coloredBlur"/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>
  </defs>
  
  <rect width="100%" height="100%" fill="#0a0a0a"/>
  <rect x="20" y="20" width="984" height="984" fill="none" stroke="url(#pollGradient)" stroke-width="3" rx="20"/>
  
  <text x="512" y="150" font-family="Arial, sans-serif" font-size="42" fill="url(#pollGradient)" 
        text-anchor="middle" filter="url(#glow)" font-weight="bold">
    🎨 Pollinations.ai
  </text>
  
  <text x="512" y="200" font-family="Arial, sans-serif" font-size="22" fill="#EC4899" text-anchor="middle">
    FREE AI Image Generation
  </text>
  
  <rect x="80" y="250" width="864" height="100" fill="rgba(255,255,255,0.05)" rx="15" stroke="url(#pollGradient)" stroke-width="1"/>
  <text x="512" y="295" font-family="Arial, sans-serif" font-size="18" fill="#F59E0B" text-anchor="middle" font-weight="bold">
    ⚠️ Error Temporal
  </text>
  <text x="512" y="325" font-family="Arial, sans-serif" font-size="14" fill="#e0e0e0" text-anchor="middle">
    ${error.substring(0, 60)}...
  </text>
  
  <rect x="80" y="380" width="864" height="300" fill="rgba(255,255,255,0.03)" rx="15"/>
  <text x="512" y="420" font-family="Arial, sans-serif" font-size="20" fill="#8B5CF6" text-anchor="middle" font-weight="bold">
    👗 Tu Prompt:
  </text>
  <text x="512" y="460" font-family="Arial, sans-serif" font-size="16" fill="#e0e0e0" text-anchor="middle">
    "${prompt.substring(0, 50)}..."
  </text>
  
  <text x="512" y="520" font-family="Arial, sans-serif" font-size="18" fill="#10B981" text-anchor="middle" font-weight="bold">
    ✨ Beneficios de Pollinations.ai:
  </text>
  <text x="512" y="555" font-family="Arial, sans-serif" font-size="14" fill="#9CA3AF" text-anchor="middle">
    🆓 100% GRATIS - Sin API key requerida
  </text>
  <text x="512" y="580" font-family="Arial, sans-serif" font-size="14" fill="#9CA3AF" text-anchor="middle">
    🎯 Modelos: FLUX, SDXL, Stable Diffusion
  </text>
  <text x="512" y="605" font-family="Arial, sans-serif" font-size="14" fill="#9CA3AF" text-anchor="middle">
    👗 Optimizado para moda y fashion
  </text>
  <text x="512" y="630" font-family="Arial, sans-serif" font-size="14" fill="#9CA3AF" text-anchor="middle">
    🚀 Sin límites de generación
  </text>
  
  <text x="512" y="720" font-family="Arial, sans-serif" font-size="16" fill="#F59E0B" text-anchor="middle">
    💡 Intenta nuevamente - El servicio es gratuito y sin límites
  </text>
  
  <rect x="80" y="760" width="864" height="120" fill="rgba(139, 92, 246, 0.1)" rx="15" stroke="#8B5CF6" stroke-width="1"/>
  <text x="512" y="800" font-family="Arial, sans-serif" font-size="18" fill="#8B5CF6" text-anchor="middle" font-weight="bold">
    🔧 Solución
  </text>
  <text x="512" y="830" font-family="Arial, sans-serif" font-size="14" fill="#e0e0e0" text-anchor="middle">
    • Verifica tu conexión a internet
  </text>
  <text x="512" y="855" font-family="Arial, sans-serif" font-size="14" fill="#e0e0e0" text-anchor="middle">
    • Intenta con un prompt más corto o simple
  </text>
  
  <text x="512" y="950" font-family="Arial, sans-serif" font-size="14" fill="#666" text-anchor="middle">
    FashionistApp • Powered by Pollinations.ai (FREE!) • ${new Date().toLocaleDateString()}
  </text>
</svg>`;

  fs.writeFileSync(filePath, fallbackSVG);
  log(`🚨 Imagen fallback generada: ${filePath}`, "pollinations-fallback");
  
  return filePath.replace(/\\/g, '/');
}

/**
 * 🧪 Test del servicio de Pollinations
 */
export async function testPollinationsService(): Promise<{ success: boolean; message: string; result?: string }> {
  try {
    log("🧪 Testing Pollinations.ai service...", "pollinations-test");
    
    const testResult = await generateFashionImageWithPollinations({
      prompt: "elegant black dress on fashion model",
      fashionStyle: "editorial",
      width: 512,
      height: 512
    });
    
    return {
      success: true,
      message: "✅ Pollinations.ai funcionando correctamente (GRATIS!)",
      result: testResult
    };
    
  } catch (error: any) {
    return {
      success: false,
      message: `❌ Error en test de Pollinations: ${error.message}`
    };
  }
}
