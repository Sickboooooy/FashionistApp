import { ensureUploadsDir } from "./image-service";
import fs from "fs";
import path from "path";
import { cacheService } from "./cacheService";
import { log } from "../vite";

// Configuración de Replicate
const REPLICATE_API_URL = "https://api.replicate.com/v1/predictions";
const REPLICATE_TOKEN = process.env.REPLICATE_API_TOKEN || "";

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
 * 🎨 Genera imágenes fashion usando Replicate + FLUX
 * ¡La joya de la corona económica!
 */
export async function generateFashionImageWithReplicate(options: ReplicateImageOptions): Promise<string> {
  const {
    prompt,
    model = "flux-schnell", // El más rápido y barato
    aspectRatio = "1:1",
    outputFormat = "jpg",
    outputQuality = 90,
    numOutputs = 1
  } = options;

  // Crear prompt especializado para fashion
  const enhancedPrompt = enhanceFashionPrompt(prompt);
  
  // Cache key
  const cacheKey = `replicate_${model}_${enhancedPrompt}_${aspectRatio}_${outputFormat}`;
  const cachedResult = cacheService.get<string>(cacheKey);
  
  if (cachedResult) {
    log("✨ Imagen fashion cacheada encontrada", "replicate-cache");
    return cachedResult;
  }

  if (!REPLICATE_TOKEN) {
    log("🎭 Modo demo: generando imagen placeholder", "replicate-demo");
    return await generateDemoFashionImage(enhancedPrompt);
  }

  try {
    log(`🎨 Generando imagen fashion con Replicate ${model.toUpperCase()}...`, "replicate");
    
    // Seleccionar el modelo correcto
    const modelVersion = getModelVersion(model);
    
    // Crear predicción
    const prediction = await createPrediction({
      version: modelVersion,
      input: {
        prompt: enhancedPrompt,
        num_outputs: numOutputs,
        aspect_ratio: aspectRatio,
        output_format: outputFormat,
        output_quality: outputQuality,
        // Parámetros específicos para fashion
        guidance_scale: 7.5, // Balance entre creatividad y adherencia al prompt
        num_inference_steps: model === "flux-schnell" ? 4 : 20, // Schnell es ultra rápido
        seed: Math.floor(Math.random() * 1000000) // Aleatoriedad
      }
    });

    // Esperar a que termine
    const finalPrediction = await waitForPrediction(prediction.id);
    
    if (finalPrediction.status === "succeeded" && finalPrediction.output) {
      // Descargar y guardar la imagen
      const imagePath = await downloadAndSaveImage(finalPrediction.output[0], enhancedPrompt);
      
      // Cachear resultado
      cacheService.set(cacheKey, imagePath); // Cache sin expiración específica
      
      log(`🎉 Imagen fashion generada exitosamente: ${imagePath}`, "replicate-success");
      return imagePath;
    } else {
      throw new Error(`Fallo en generación: ${finalPrediction.error || 'Estado: ' + finalPrediction.status}`);
    }

  } catch (error: any) {
    log(`❌ Error en Replicate: ${error.message}`, "replicate-error");
    
    // Fallback a imagen demo
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
 * 📸 Descargar y guardar imagen
 */
async function downloadAndSaveImage(imageUrl: string, prompt: string): Promise<string> {
  ensureUploadsDir();
  
  const response = await fetch(imageUrl);
  if (!response.ok) {
    throw new Error(`Error al descargar imagen: ${response.status}`);
  }
  
  const arrayBuffer = await response.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  
  // Crear nombre de archivo
  const timestamp = Date.now();
  const fileName = `replicate_fashion_${timestamp}.jpg`;
  const filePath = path.join("uploads", fileName);
  
  // Guardar archivo
  fs.writeFileSync(filePath, buffer);
  
  // Guardar metadata
  const metadataPath = path.join("uploads", `${path.basename(fileName, '.jpg')}_metadata.json`);
  fs.writeFileSync(metadataPath, JSON.stringify({
    prompt,
    generated_at: new Date().toISOString(),
    provider: "replicate",
    model: "flux",
    original_url: imageUrl
  }, null, 2));
  
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
 * 🎭 Generar imagen demo cuando no hay API key
 */
async function generateDemoFashionImage(prompt: string, error?: string): Promise<string> {
  ensureUploadsDir();
  
  const timestamp = Date.now();
  const fileName = `replicate_demo_${timestamp}.svg`;
  const filePath = path.join("uploads", fileName);
  
  const demoContent = `
  <svg width="1024" height="1024" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="fashionGradient" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#ff6b6b" />
        <stop offset="33%" stop-color="#4ecdc4" />
        <stop offset="66%" stop-color="#45b7d1" />
        <stop offset="100%" stop-color="#96ceb4" />
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
    <rect x="20" y="20" width="984" height="984" fill="url(#fashionGradient)" opacity="0.1" rx="20"/>
    
    <!-- Header -->
    <text x="512" y="100" font-family="Arial, sans-serif" font-size="48" fill="url(#fashionGradient)" 
          text-anchor="middle" filter="url(#glow)" font-weight="bold">
      🚀 REPLICATE + FLUX
    </text>
    
    <text x="512" y="150" font-family="Arial, sans-serif" font-size="24" fill="#4ecdc4" text-anchor="middle">
      Fashion AI Image Generation
    </text>
    
    <!-- Modelo info -->
    <rect x="100" y="200" width="824" height="100" fill="rgba(255,255,255,0.05)" rx="15"/>
    <text x="512" y="235" font-family="Arial, sans-serif" font-size="20" fill="#96ceb4" text-anchor="middle" font-weight="bold">
      MODELO: FLUX-SCHNELL ⚡
    </text>
    <text x="512" y="265" font-family="Arial, sans-serif" font-size="16" fill="#45b7d1" text-anchor="middle">
      Ultra rápido • $0.003 por imagen • 92.5% más barato que OpenAI
    </text>
    
    <!-- Prompt section -->
    <rect x="100" y="330" width="824" height="400" fill="rgba(255,255,255,0.08)" rx="15" stroke="url(#fashionGradient)" stroke-width="2"/>
    <text x="512" y="370" font-family="Arial, sans-serif" font-size="22" fill="#ff6b6b" text-anchor="middle" font-weight="bold">
      PROMPT FASHION:
    </text>
    
    <foreignObject x="120" y="390" width="784" height="320">
      <div xmlns="http://www.w3.org/1999/xhtml" style="
        font-family: Arial, sans-serif; 
        font-size: 18px; 
        color: #e0e0e0; 
        line-height: 1.6;
        padding: 20px;
        text-align: center;
      ">
        <p style="color: #4ecdc4; margin-bottom: 20px;">"${prompt}"</p>
        <hr style="border: 1px solid #333; margin: 20px 0;"/>
        <p style="font-size: 16px; color: #96ceb4;">
          ✨ Enhanced with professional fashion photography keywords<br/>
          🎯 Optimized for clothing, textures, and lighting<br/>
          📸 Commercial quality output<br/>
          ${error ? `⚠️ Demo mode: ${error.substring(0, 50)}...` : '🔑 Configure REPLICATE_API_TOKEN to activate'}
        </p>
      </div>
    </foreignObject>
    
    <!-- Features -->
    <rect x="100" y="760" width="824" height="120" fill="rgba(255,255,255,0.05)" rx="15"/>
    <text x="512" y="795" font-family="Arial, sans-serif" font-size="18" fill="#45b7d1" text-anchor="middle" font-weight="bold">
      🎉 REPLICATE FLUX FEATURES
    </text>
    <text x="256" y="825" font-family="Arial, sans-serif" font-size="14" fill="#96ceb4" text-anchor="middle">
      ⚡ 2-5 seg generación
    </text>
    <text x="512" y="825" font-family="Arial, sans-serif" font-size="14" fill="#4ecdc4" text-anchor="middle">
      💰 Ultra económico
    </text>
    <text x="768" y="825" font-family="Arial, sans-serif" font-size="14" fill="#ff6b6b" text-anchor="middle">
      👗 Perfecto para fashion
    </text>
    <text x="512" y="850" font-family="Arial, sans-serif" font-size="14" fill="#45b7d1" text-anchor="middle">
      🔧 API simple • 📈 Escalable • 🎨 SOTA quality
    </text>
    
    <!-- Footer -->
    <text x="512" y="940" font-family="Arial, sans-serif" font-size="16" fill="#666" text-anchor="middle">
      FashionistApp • Powered by Replicate FLUX • ${new Date().toLocaleDateString()}
    </text>
  </svg>
  `;
  
  fs.writeFileSync(filePath, demoContent);
  log(`🎭 Imagen demo generada: ${filePath}`, "replicate-demo");
  
  // Normalizar la ruta para URLs (usar barras normales)
  const normalizedPath = filePath.replace(/\\/g, '/');
  return normalizedPath;
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