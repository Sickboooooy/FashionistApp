/**
 * 👗 ModelsLab Virtual Try-On Service
 *
 * Prueba virtual de prendas: coloca una prenda del inventario sobre la foto
 * de un modelo/usuario usando la Fashion API de ModelsLab.
 *
 * Endpoint:  POST https://modelslab.com/api/v6/image_editing/fashion
 * Docs:      https://docs.modelslab.com/image-editing/fashion
 * Precio:    ~$0.002/imagen · free tier 100/día · $29/mes ilimitado
 *
 * ⚠️ IMPORTANTE: tanto `init_image` (foto del modelo) como `cloth_image`
 * (prenda) deben ser URLs PÚBLICAS accesibles por ModelsLab. En localhost
 * las rutas locales (`/products/...`, `/uploads/...`) NO son alcanzables;
 * funciona en producción detrás de un dominio público. Sin API key, el
 * servicio devuelve una imagen demo informativa (igual que replicate-service).
 */

import { ensureUploadsDir } from "./image-service";
import fs from "fs";
import path from "path";
import { cacheService } from "./cacheService";
import { log } from "../vite";

const MODELSLAB_FASHION_URL = "https://modelslab.com/api/v6/image_editing/fashion";
const MODELSLAB_KEY = process.env.MODELSLAB_API_KEY || "";

if (!MODELSLAB_KEY || MODELSLAB_KEY === "your_modelslab_key_here") {
  log("⚠️  MODELSLAB_API_KEY no configurada - try-on en modo demo", "tryon-warning");
} else {
  log("👗 ModelsLab Fashion API configurada correctamente", "tryon");
}

export type ClothType = "upper_body" | "lower_body" | "dresses";

export interface VirtualTryOnOptions {
  /** URL pública de la foto del modelo/usuario. */
  modelImageUrl: string;
  /** URL pública de la prenda (imageUrl del producto del inventario). */
  clothImageUrl: string;
  /** Tipo de prenda; si se omite se infiere de la categoría del producto. */
  clothType?: ClothType;
  /** Categoría del producto del inventario ("top" | "bottom" | "dress"...). */
  productCategory?: string;
  prompt?: string;
  guidanceScale?: number;
  numInferenceSteps?: number;
  seed?: number;
}

interface ModelsLabResponse {
  status: "success" | "processing" | "error" | string;
  id?: number | string;
  output?: string[];
  eta?: number;
  fetch_result?: string;
  message?: string;
  messege?: string; // ModelsLab a veces devuelve este typo
}

/** Mapea la categoría del inventario al cloth_type que entiende ModelsLab. */
export function categoryToClothType(category?: string): ClothType {
  switch ((category || "").toLowerCase()) {
    case "bottom":
    case "bottoms":
    case "pants":
    case "leggings":
      return "lower_body";
    case "dress":
    case "dresses":
    case "vestido":
      return "dresses";
    case "top":
    case "tops":
    case "shirt":
    case "sweater":
    default:
      return "upper_body";
  }
}

/**
 * Ejecuta la prueba virtual y devuelve la ruta local de la imagen resultante.
 */
export async function generateVirtualTryOn(options: VirtualTryOnOptions): Promise<string> {
  const {
    modelImageUrl,
    clothImageUrl,
    clothType = categoryToClothType(options.productCategory),
    prompt = "high quality, realistic virtual try-on, natural fit, professional fashion photography",
    guidanceScale = 8.0,
    numInferenceSteps = 21,
    seed,
  } = options;

  if (!modelImageUrl || !clothImageUrl) {
    throw new Error("Se requieren modelImageUrl y clothImageUrl (URLs públicas).");
  }

  const cacheKey = `tryon_${modelImageUrl}_${clothImageUrl}_${clothType}`;
  const cached = cacheService.get<string>(cacheKey);
  if (cached) {
    log("✨ Try-on cacheado encontrado", "tryon-cache");
    return cached;
  }

  // Sin API key → demo
  if (!MODELSLAB_KEY || MODELSLAB_KEY === "your_modelslab_key_here") {
    return generateDemoTryOn(clothType, "MODELSLAB_API_KEY no configurada");
  }

  try {
    log(`👗 Generando try-on (${clothType}) con ModelsLab...`, "tryon");

    const response = await fetch(MODELSLAB_FASHION_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        key: MODELSLAB_KEY,
        prompt,
        negative_prompt:
          "low quality, distorted, deformed body, extra limbs, bad anatomy, blurry",
        init_image: modelImageUrl,
        cloth_image: clothImageUrl,
        cloth_type: clothType,
        guidance_scale: guidanceScale,
        num_inference_steps: numInferenceSteps,
        seed: seed ?? null,
        temp: false,
        webhook: null,
        track_id: null,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`ModelsLab API error: ${response.status} - ${errorText}`);
    }

    let result: ModelsLabResponse = await response.json();

    // Estado asíncrono: hacer polling al fetch_result hasta success.
    if (result.status === "processing" && result.fetch_result) {
      result = await pollForResult(result.fetch_result, (result.eta || 10) * 1000 + 60000);
    }

    if (result.status === "success" && result.output && result.output.length > 0) {
      const imagePath = await downloadAndSaveImage(result.output[0]);
      cacheService.set(cacheKey, imagePath);
      log(`🎉 Try-on generado exitosamente: ${imagePath}`, "tryon-success");
      return imagePath;
    }

    throw new Error(
      `Try-on falló: ${result.message || result.messege || `status=${result.status}`}`
    );
  } catch (error: any) {
    log(`❌ Error en ModelsLab try-on: ${error.message}`, "tryon-error");
    return generateDemoTryOn(clothType, error.message);
  }
}

/** Hace polling al endpoint fetch_result hasta que el estado sea success/error. */
async function pollForResult(fetchUrl: string, maxWaitTime: number): Promise<ModelsLabResponse> {
  const startTime = Date.now();
  const pollInterval = 3000;

  while (Date.now() - startTime < maxWaitTime) {
    await new Promise((resolve) => setTimeout(resolve, pollInterval));

    const response = await fetch(fetchUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key: MODELSLAB_KEY }),
    });

    if (!response.ok) continue;

    const result: ModelsLabResponse = await response.json();
    log(`⏳ Try-on estado: ${result.status}...`, "tryon-progress");

    if (result.status === "success" || result.status === "error") {
      return result;
    }
  }

  throw new Error("Timeout: la prueba virtual tomó demasiado tiempo");
}

/** Descarga la imagen resultante y la guarda en uploads/. */
async function downloadAndSaveImage(imageUrl: string): Promise<string> {
  ensureUploadsDir();

  const response = await fetch(imageUrl);
  if (!response.ok) {
    throw new Error(`Error al descargar resultado del try-on: ${response.status}`);
  }

  const arrayBuffer = await response.arrayBuffer();
  const fileName = `tryon_${Date.now()}.jpg`;
  const filePath = path.join("uploads", fileName);
  fs.writeFileSync(filePath, new Uint8Array(arrayBuffer));

  return filePath.replace(/\\/g, "/");
}

/** Imagen demo informativa cuando no hay key o falla la API. */
function generateDemoTryOn(clothType: string, reason: string): string {
  ensureUploadsDir();

  const fileName = `tryon_demo_${Date.now()}.svg`;
  const filePath = path.join("uploads", fileName);

  const svg = `
  <svg width="768" height="1024" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#d4af37" />
        <stop offset="100%" stop-color="#f9f295" />
      </linearGradient>
    </defs>
    <rect width="100%" height="100%" fill="#0a0a0a"/>
    <rect x="15" y="15" width="738" height="994" fill="none" stroke="url(#g)" stroke-width="2" rx="12"/>
    <text x="384" y="120" font-family="Arial" font-size="34" fill="url(#g)" text-anchor="middle">👗 Virtual Try-On</text>
    <text x="384" y="170" font-family="Arial" font-size="20" fill="#f9f295" text-anchor="middle">FashionistApp · ModelsLab</text>
    <text x="384" y="520" font-family="Arial" font-size="22" fill="#ddd" text-anchor="middle">Prenda: ${clothType}</text>
    <text x="384" y="560" font-family="Arial" font-size="16" fill="#999" text-anchor="middle">Modo demo</text>
    <text x="384" y="600" font-family="Arial" font-size="14" fill="#777" text-anchor="middle">${reason.substring(0, 60)}</text>
    <text x="384" y="940" font-family="Arial" font-size="14" fill="#555" text-anchor="middle">Configura MODELSLAB_API_KEY para activar</text>
  </svg>`;

  fs.writeFileSync(filePath, svg);
  log(`🎭 Try-on demo generado: ${filePath}`, "tryon-demo");
  return filePath.replace(/\\/g, "/");
}
