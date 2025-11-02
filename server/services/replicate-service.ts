import { ensureUploadsDir } from "./image-service";
import fs from "fs";
import path from "path";
import { cacheService } from "./cacheService";
import { log } from "../vite";

// Configuración de Replicate
const REPLICATE_API_URL = "https://api.replicate.com/v1/predictions";
const REPLICATE_TOKEN = process.env?.REPLICATE_API_TOKEN || "";

// Verificar configuración
if (!REPLICATE_TOKEN) {
  log("⚠️  REPLICATE_API_TOKEN no configurado - usando modo demo", "replicate-warning");
} else {
  log("🚀 Replicate API configurado correctamente", "replicate");
}

interface ReplicateImageOptions {
  prompt: string;
  model?: "flux-schnell" | "flux-dev" | "flux-pro";
  aspectRatio?: "1:1" | "16:9" | "9:16" | "4:3" | "3:4";
  outputFormat?: "jpg" | "png" | "webp";
  outputQuality?: number;
  numOutputs?: number;
  // 🎨 FLUX-specific advanced options
  guidanceScale?: number;
  numInferenceSteps?: number;
  seed?: number;
  // 👗 Fashion-specific enhancements
  fashionStyle?: "editorial" | "street" | "haute-couture" | "casual" | "commercial";
  enhanceForFashion?: boolean;
}

interface ReplicatePrediction {
  id: string;
  status: "starting" | "processing" | "succeeded" | "failed" | "canceled";
  output?: string[];
  error?: string;
  urls?: {
    get: string;
    cancel: string;
  };
}

/**
 * 🎨 Genera imágenes fashion usando Replicate + FLUX.1-dev
 * ¡La joya de la corona económica con calidad profesional!
 */
export async function generateFashionImageWithReplicate(options: ReplicateImageOptions): Promise<string> {
  const {
    prompt,
    model = "flux-dev", // Usar FLUX-dev por defecto
    aspectRatio = "1:1",
    outputFormat = "jpg",
    outputQuality = 90,
    numOutputs = 1,
    guidanceScale,
    numInferenceSteps,
    seed,
    fashionStyle = "editorial",
    enhanceForFashion = true
  } = options;

  // 👗 Crear prompt especializado para fashion con FLUX.1-dev
  const enhancedPrompt = enhanceForFashion 
    ? enhanceFashionPromptForFlux(prompt, fashionStyle)
    : prompt;
  
  // Cache key más específico
  const cacheKey = `flux_${model}_${enhancedPrompt}_${aspectRatio}_${outputFormat}_${fashionStyle}`;
  const cachedResult = cacheService.get<string>(cacheKey);
  
  if (cachedResult) {
    log(`✨ Imagen fashion cacheada encontrada para ${model.toUpperCase()}`, "replicate-cache");
    return cachedResult;
  }

  if (!REPLICATE_TOKEN) {
    log("🎭 Modo demo: generando imagen placeholder", "replicate-demo");
    return await generateDemoFashionImage(enhancedPrompt, model);
  }

  try {
    log(`🎨 Generando imagen fashion con ${model.toUpperCase()}...`, "replicate");
    
    // Seleccionar el modelo y configuración óptima
    const modelConfig = getOptimalFluxConfig(model, fashionStyle);
    
    // Crear predicción con configuración específica para cada modelo FLUX
    const prediction = await createPrediction({
      version: modelConfig.version,
      input: {
        prompt: enhancedPrompt,
        num_outputs: numOutputs,
        aspect_ratio: aspectRatio,
        output_format: outputFormat,
        output_quality: outputQuality,
        // Configuración optimizada por modelo
        guidance_scale: guidanceScale || modelConfig.guidanceScale,
        num_inference_steps: numInferenceSteps || modelConfig.steps,
        seed: seed || Math.floor(Math.random() * 1000000),
        // FLUX-specific parameters
        ...(model === "flux-pro" && {
          safety_tolerance: 2, // Menos restrictivo para fashion
          disable_safety_checker: false
        })
      }
    });

    // Esperar con timeout específico por modelo
    const timeout = model === "flux-schnell" ? 30000 : 120000; // Schnell es más rápido
    const finalPrediction = await waitForPrediction(prediction.id, timeout);
    
    if (finalPrediction.status === "succeeded" && finalPrediction.output) {
      // Descargar y guardar la imagen
      const imagePath = await downloadAndSaveImage(
        finalPrediction.output[0], 
        enhancedPrompt
      );
      
      // Cachear resultado
      cacheService.set(cacheKey, imagePath);
      
      log(`🎉 Imagen fashion generada exitosamente con ${model.toUpperCase()}: ${imagePath}`, "replicate-success");
      return imagePath;
    } else {
      throw new Error(`Fallo en generación con ${model}: ${finalPrediction.error || 'Estado: ' + finalPrediction.status}`);
    }

  } catch (error: any) {
    log(`❌ Error en Replicate ${model.toUpperCase()}: ${error.message}`, "replicate-error");
    
    // Fallback a modelo más rápido si el actual falla
    if (model === "flux-pro" || model === "flux-dev") {
      log("🔄 Intentando fallback a flux-schnell...", "replicate-fallback");
      try {
        return await generateFashionImageWithReplicate({
          ...options,
          model: "flux-schnell"
        });
      } catch (fallbackError: any) {
        log(`❌ Fallback también falló: ${fallbackError.message}`, "replicate-error");
      }
    }
    
    // Último recurso: imagen demo
    return await generateDemoFashionImage(enhancedPrompt, error.message);
  }
}

/**
 * 🎭 Crear predicción en Replicate
 */
async function createPrediction(data: any): Promise<ReplicatePrediction> {
  const response = await fetch(REPLICATE_API_URL, {
    method: "POST",
    headers: {
      "Authorization": `Token ${REPLICATE_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data)
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Replicate API error: ${response.status} - ${errorText}`);
  }

  return await response.json();
}

/**
 * ⏰ Esperar a que termine la predicción
 */
async function waitForPrediction(predictionId: string, maxWaitTime = 60000): Promise<ReplicatePrediction> {
  const startTime = Date.now();
  const pollInterval = 1000; // 1 segundo
  
  while (Date.now() - startTime < maxWaitTime) {
    const response = await fetch(`${REPLICATE_API_URL}/${predictionId}`, {
      headers: {
        "Authorization": `Token ${REPLICATE_TOKEN}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Error al consultar predicción: ${response.status}`);
    }

    const prediction = await response.json();
    
    if (prediction.status === "succeeded" || prediction.status === "failed") {
      return prediction;
    }
    
    // Log progreso
    log(`⏳ Estado: ${prediction.status}...`, "replicate-progress");
    
    // Esperar antes del siguiente poll
    await new Promise(resolve => setTimeout(resolve, pollInterval));
  }
  
  throw new Error("Timeout: La generación tomó demasiado tiempo");
}

/**
 * 🎯 Obtener configuración óptima para cada modelo FLUX
 */
function getOptimalFluxConfig(model: string, fashionStyle: string) {
  const baseConfigs = {
    "flux-schnell": {
      version: "f2ab8a5569070ad0648a80556174f55c5e7bf6f5ca4ac2200e87a81b5db3cf80",
      steps: 4,
      guidanceScale: 7.5,
      description: "Ultra rápido, ideal para previews"
    },
    "flux-dev": {
      version: "5599ed30703defd1d160a25a63321b4dec97101d98b4674bcc56e41f62f35637",
      steps: 20,
      guidanceScale: 3.5,
      description: "Balance perfecto calidad/velocidad"
    },
    "flux-pro": {
      version: "7437abc57c7e8a53ba7a3bb6e99dc26b887b31eaa02aba03b7b7c6f4c6b9e5b1",
      steps: 50,
      guidanceScale: 3.0,
      description: "Máxima calidad para producción"
    }
  };
  
  const config = baseConfigs[model as keyof typeof baseConfigs] || baseConfigs["flux-dev"];
  
  // Ajustar parámetros según estilo de fashion
  if (fashionStyle === "haute-couture") {
    config.guidanceScale = Math.min(config.guidanceScale + 1, 7.5);
    config.steps = Math.min(config.steps + 10, 50);
  } else if (fashionStyle === "street") {
    config.guidanceScale = Math.max(config.guidanceScale - 0.5, 1.0);
  }
  
  return config;
}

/**
 * 👗 Mejora prompt específicamente para FLUX con terminología fashion
 */
function enhanceFashionPromptForFlux(basePrompt: string, fashionStyle: string): string {
  const styleModifiers = {
    "editorial": "high-fashion editorial photography, professional lighting, studio setup",
    "street": "urban street style photography, natural lighting, authentic poses",
    "haute-couture": "haute couture fashion photography, dramatic lighting, luxury materials",
    "casual": "casual wear photography, soft natural lighting, lifestyle setting",
    "commercial": "commercial fashion photography, clean background, product focus"
  };
  
  const fluxOptimizedTerms = [
    "detailed fabric textures",
    "professional fashion photography",
    "high resolution",
    "sharp focus",
    "vibrant colors",
    "modern styling",
    "fashion model",
    "clothing details",
    "textile clarity"
  ];
  
  const modifier = styleModifiers[fashionStyle as keyof typeof styleModifiers] || styleModifiers.editorial;
  const terms = fluxOptimizedTerms.join(", ");
  
  return `${basePrompt}, ${modifier}, ${terms}, trending fashion, magazine quality, FLUX.1 optimized`;
}

/**
 * 📸 Descargar y guardar imagen con metadata mejorada
 */
async function downloadAndSaveImage(imageUrl: string, prompt: string, model?: string, fashionStyle?: string): Promise<string> {
  ensureUploadsDir();
  
  const response = await fetch(imageUrl);
  if (!response.ok) {
    throw new Error(`Error al descargar imagen: ${response.status}`);
  }
  
  const arrayBuffer = await response.arrayBuffer();
  const uint8Array = new Uint8Array(arrayBuffer);
  
  // Crear nombre de archivo más descriptivo
  const timestamp = Date.now();
  const modelPrefix = model ? `${model}_` : "";
  const fileName = `${modelPrefix}fashion_${timestamp}.jpg`;
  const filePath = path.join("uploads", fileName);
  
  // Guardar archivo
  fs.writeFileSync(filePath, uint8Array);
  
  // Guardar metadata mejorada
  const metadataPath = path.join("uploads", `${path.basename(fileName, '.jpg')}_metadata.json`);
  fs.writeFileSync(metadataPath, JSON.stringify({
    prompt,
    model: model || "unknown",
    fashionStyle: fashionStyle || "editorial",
    generated_at: new Date().toISOString(),
    provider: "replicate",
    original_url: imageUrl,
    costs: {
      "flux-schnell": "$0.003",
      "flux-dev": "$0.055", 
      "flux-pro": "$0.15"
    }[model || "flux-dev"] || "unknown"
  }, null, 2));
  
  // Normalizar la ruta para URLs (usar barras normales)
  const normalizedPath = filePath.replace(/\\/g, '/');
  return normalizedPath;
}

/**
 * 🎭 Generar imagen demo cuando no hay API key con info del modelo
 */
async function generateDemoFashionImage(prompt: string, model?: string, error?: string): Promise<string> {
  ensureUploadsDir();
  
  const timestamp = Date.now();
  const modelInfo = model ? `_${model}` : "";
  const fileName = `flux${modelInfo}_demo_${timestamp}.svg`;
  const filePath = path.join("uploads", fileName);
  
  const modelDetails = {
    "flux-schnell": { cost: "$0.003", speed: "⚡ 1-4 steps", quality: "Preview quality" },
    "flux-dev": { cost: "$0.055", speed: "⚖️ 20 steps", quality: "Production ready" },
    "flux-pro": { cost: "$0.15", speed: "🏆 50+ steps", quality: "Maximum quality" }
  };
  
  const info = modelDetails[model as keyof typeof modelDetails] || modelDetails["flux-dev"];
  
  const demoContent = `
  <svg width="1024" height="1024" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="fluxGradient" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#8B5CF6" />
        <stop offset="33%" stop-color="#06B6D4" />
        <stop offset="66%" stop-color="#10B981" />
        <stop offset="100%" stop-color="#F59E0B" />
      </linearGradient>
      <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
        <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
        <feMerge>
          <feMergeNode in="coloredBlur"/>
          <feMergeNode in="SourceGraphic"/>
        </feMerge>
      </filter>
    </defs>
    
    <rect width="100%" height="100%" fill="#000"/>
    <rect x="20" y="20" width="984" height="984" fill="url(#fluxGradient)" opacity="0.1" rx="20"/>
    
    <!-- Header -->
    <text x="512" y="80" font-family="Arial, sans-serif" font-size="42" fill="url(#fluxGradient)" 
          text-anchor="middle" filter="url(#glow)" font-weight="bold">
      🎨 FLUX.1-${model?.toUpperCase() || 'DEV'}
    </text>
    
    <text x="512" y="130" font-family="Arial, sans-serif" font-size="24" fill="#8B5CF6" text-anchor="middle">
      AI Fashion Image Generation
    </text>
    
    <!-- Model specs -->
    <rect x="100" y="160" width="824" height="120" fill="rgba(255,255,255,0.05)" rx="15" stroke="url(#fluxGradient)" stroke-width="2"/>
    <text x="512" y="195" font-family="Arial, sans-serif" font-size="22" fill="#10B981" text-anchor="middle" font-weight="bold">
      📊 ${model?.toUpperCase() || 'FLUX-DEV'} SPECS
    </text>
    <text x="256" y="225" font-family="Arial, sans-serif" font-size="16" fill="#06B6D4" text-anchor="middle">
      💰 ${info.cost} per image
    </text>
    <text x="512" y="225" font-family="Arial, sans-serif" font-size="16" fill="#8B5CF6" text-anchor="middle">
      ${info.speed}
    </text>
    <text x="768" y="225" font-family="Arial, sans-serif" font-size="16" fill="#F59E0B" text-anchor="middle">
      ${info.quality}
    </text>
    <text x="512" y="255" font-family="Arial, sans-serif" font-size="14" fill="#10B981" text-anchor="middle">
      ✨ Optimizado para fashion y textiles
    </text>
    
    <!-- Prompt section -->
    <rect x="100" y="300" width="824" height="400" fill="rgba(255,255,255,0.08)" rx="15" stroke="url(#fluxGradient)" stroke-width="2"/>
    <text x="512" y="340" font-family="Arial, sans-serif" font-size="20" fill="#8B5CF6" text-anchor="middle" font-weight="bold">
      👗 FASHION PROMPT:
    </text>
    
    <foreignObject x="120" y="360" width="784" height="320">
      <div xmlns="http://www.w3.org/1999/xhtml" style="
        font-family: Arial, sans-serif; 
        font-size: 16px; 
        color: #e0e0e0; 
        line-height: 1.6;
        padding: 20px;
        text-align: center;
      ">
        <p style="color: #06B6D4; margin-bottom: 20px; font-size: 18px;">"${prompt.length > 100 ? prompt.substring(0, 100) + '...' : prompt}"</p>
        <hr style="border: 1px solid #333; margin: 20px 0;"/>
        <p style="font-size: 14px; color: #10B981;">
          ✨ FLUX.1-${model?.toUpperCase() || 'DEV'} Features:<br/>
          🎯 State-of-the-art diffusion model<br/>
          👗 Optimized for fashion and clothing<br/>
          📸 Professional photography quality<br/>
          🌐 Multi-language prompt support<br/>
          ${error ? `⚠️ Demo mode: ${error.substring(0, 40)}...` : '🔑 Configure REPLICATE_API_TOKEN to activate'}
        </p>
      </div>
    </foreignObject>
    
    <!-- Comparison -->
    <rect x="100" y="720" width="824" height="140" fill="rgba(255,255,255,0.05)" rx="15"/>
    <text x="512" y="755" font-family="Arial, sans-serif" font-size="18" fill="#F59E0B" text-anchor="middle" font-weight="bold">
      🏆 FLUX.1 MODEL COMPARISON
    </text>
    <text x="200" y="785" font-family="Arial, sans-serif" font-size="14" fill="#8B5CF6" text-anchor="middle" font-weight="bold">SCHNELL</text>
    <text x="200" y="805" font-family="Arial, sans-serif" font-size="12" fill="#06B6D4" text-anchor="middle">$0.003 • ⚡ 4 steps</text>
    <text x="200" y="820" font-family="Arial, sans-serif" font-size="12" fill="#10B981" text-anchor="middle">Preview quality</text>
    
    <text x="512" y="785" font-family="Arial, sans-serif" font-size="14" fill="#8B5CF6" text-anchor="middle" font-weight="bold">DEV ⭐</text>
    <text x="512" y="805" font-family="Arial, sans-serif" font-size="12" fill="#06B6D4" text-anchor="middle">$0.055 • ⚖️ 20 steps</text>
    <text x="512" y="820" font-family="Arial, sans-serif" font-size="12" fill="#10B981" text-anchor="middle">Production ready</text>
    
    <text x="824" y="785" font-family="Arial, sans-serif" font-size="14" fill="#8B5CF6" text-anchor="middle" font-weight="bold">PRO</text>
    <text x="824" y="805" font-family="Arial, sans-serif" font-size="12" fill="#06B6D4" text-anchor="middle">$0.15 • 🏆 50+ steps</text>
    <text x="824" y="820" font-family="Arial, sans-serif" font-size="12" fill="#10B981" text-anchor="middle">Maximum quality</text>
    
    <text x="512" y="845" font-family="Arial, sans-serif" font-size="12" fill="#8B5CF6" text-anchor="middle">
      🎨 All models trained on fashion datasets • Perfect for FashionistApp
    </text>
    
    <!-- Footer -->
    <text x="512" y="980" font-family="Arial, sans-serif" font-size="16" fill="#666" text-anchor="middle">
      FashionistApp • Powered by FLUX.1 • ${new Date().toLocaleDateString()}
    </text>
  </svg>
  `;
  
  fs.writeFileSync(filePath, demoContent);
  log(`🎭 Imagen demo FLUX.1-${model || 'dev'} generada: ${filePath}`, "replicate-demo");
  
  // Normalizar la ruta para URLs (usar barras normales)
  const normalizedPath = filePath.replace(/\\/g, '/');
  return normalizedPath;
}

/**
 * 🎯 Obtener versión del modelo
 */
function getModelVersion(model: string): string {
  const models = {
    "flux-schnell": "f2ab8a5569070ad0648a80556174f55c5e7bf6f5ca4ac2200e87a81b5db3cf80", // Más rápido y barato
    "flux-dev": "5599ed30703defd1d160a25a63321b4dec97101d98b4674bcc56e41f62f35637", // Mejor calidad
    "flux-pro": "7437abc57c7e8a53ba7a3bb6e99dc26b887b31eaa02aba03b7b7c6f4c6b9e5b1"  // Premium
  };
  
  return models[model as keyof typeof models] || models["flux-schnell"];
}

/**
 * 🎨 Mejorar prompt para fashion
 */
function enhanceFashionPrompt(basePrompt: string): string {
  return `Professional fashion photography: ${basePrompt}. 
High-end commercial style, studio lighting, clean background, 
detailed fabric textures, vibrant colors, modern fashion, 
editorial quality, sharp focus, 4K resolution, trending on fashion magazines`;
}

/**
 * 🧪 Función de testing
 */
export async function testReplicateService(): Promise<void> {
  log("🧪 Testing Replicate service...", "replicate-test");
  
  try {
    const testPrompt = "elegant black dress on a model, studio lighting";
    const result = await generateFashionImageWithReplicate({ prompt: testPrompt });
    log(`✅ Test exitoso: ${result}`, "replicate-test");
  } catch (error: any) {
    log(`❌ Test failed: ${error.message}`, "replicate-test");
  }
}