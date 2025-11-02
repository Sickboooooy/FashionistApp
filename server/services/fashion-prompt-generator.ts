/**
 * 🎨 FASHION PROMPT GENERATOR - LA JOYA DE LA CORONA
 * Generador especializado de prompts para revistas de moda estilo VOGUE, Cosmopolitan, Men's Health
 * 🚀 OPTIMIZADO PARA FLUX.1-dev - Estado del arte en generación de moda
 */

import { log } from "../vite";

export interface FashionContext {
  // Preferencias del usuario
  styles?: string[]; // ["elegante", "casual", "bohemio", "minimalista"]
  occasions?: string[]; // ["trabajo", "fiesta", "casual", "formal"]
  seasons?: string[]; // ["primavera", "verano", "otoño", "invierno"]
  colors?: string[]; // ["negro", "rojo", "azul", "neutros"]
  
  // Contexto de revista
  magazineStyle?: "vogue" | "cosmopolitan" | "menshealth" | "elle" | "harpers" | "gq";
  shootType?: "studio" | "street" | "editorial" | "commercial" | "runway";
  model?: "female" | "male" | "unisex";
  
  // Contexto de mercado
  targetMarket?: "mexico" | "latinamerica" | "global";
  priceRange?: "accesible" | "medio" | "premium" | "lujo";
  
  // 🚀 FLUX.1-dev específico
  fluxModel?: "flux-schnell" | "flux-dev" | "flux-pro";
  enhanceForFlux?: boolean;
}

/**
 * 🎯 Genera prompts ultra-específicos para moda estilo revista
 * 🚀 OPTIMIZADO PARA FLUX.1-dev con terminología especializada
 */
export function generateMagazineStylePrompt(
  basePrompt: string, 
  context: FashionContext = {}
): string {
  const {
    magazineStyle = "vogue",
    shootType = "editorial",
    model = "female",
    seasons = ["actual"],
    occasions = ["versatil"],
    styles = ["elegante"],
    colors = ["armonioso"],
    targetMarket = "mexico",
    fluxModel = "flux-dev",
    enhanceForFlux = true
  } = context;

  // 🏷️ PLANTILLAS ESPECIALIZADAS POR REVISTA
  const magazinePrompts = {
    vogue: "High fashion editorial photography, ultra-sophisticated, avant-garde, luxury fashion shoot, professional model, dramatic lighting, minimalist composition, Italian Vogue style",
    
    cosmopolitan: "Glamorous fashion photography, confident and empowering, vibrant colors, contemporary style, accessible luxury, modern woman aesthetic, dynamic poses",
    
    menshealth: "Masculine fashion editorial, athletic-inspired styling, contemporary menswear, confident poses, dynamic lighting, fitness-conscious style, modern gentleman",
    
    elle: "Chic editorial photography, feminine elegance, contemporary fashion, sophisticated styling, French elegance, artistic composition",
    
    harpers: "Artistic fashion photography, sophisticated editorial style, timeless elegance, haute couture inspiration, museum-quality composition",
    
    gq: "Luxury menswear editorial, sophisticated gentleman style, impeccable tailoring, confident masculine aesthetic, premium quality"
  };

  // 📸 ESTILOS DE FOTOGRAFÍA
  const shootStyles = {
    studio: "Professional studio lighting, clean backdrop, controlled environment, commercial quality, perfect lighting setup",
    street: "Urban street photography, natural lighting, authentic environment, candid moments, city backdrop",
    editorial: "High-end editorial photography, dramatic lighting, artistic composition, magazine cover quality",
    commercial: "Commercial fashion photography, product-focused, sales-oriented, clear product visibility",
    runway: "Fashion show photography, catwalk setting, dramatic presentation, high-energy atmosphere"
  };

  // 🌈 PALETAS DE COLOR SEGÚN TEMPORADA
  const seasonalColors = {
    primavera: "pastel tones, soft pinks, fresh greens, light blues, cream whites, floral colors",
    verano: "vibrant colors, coral, turquoise, sunny yellows, bright whites, tropical tones",
    otoño: "warm earth tones, burnt oranges, deep burgundy, golden browns, rich textures",
    invierno: "deep jewel tones, emerald greens, sapphire blues, classic blacks, metallic accents",
    actual: "contemporary color palette, trending seasonal colors"
  };

  // 👗 ESTILOS POR OCASIÓN
  const occasionStyles = {
    trabajo: "professional business attire, sophisticated office wear, elegant power dressing",
    fiesta: "glamorous evening wear, party-ready outfits, celebration fashion",
    casual: "relaxed everyday fashion, comfortable chic, effortless style",
    formal: "elegant formal wear, black-tie fashion, sophisticated evening attire",
    versatil: "versatile transitional pieces, day-to-night fashion"
  };

  // 🌎 ADAPTACIÓN CULTURAL
  const culturalContext = {
    mexico: "Mexican market appeal, warm climate consideration, vibrant color appreciation, cultural elegance",
    latinamerica: "Latin American fashion sensibility, tropical climate adaptation, colorful aesthetic",
    global: "international fashion appeal, universally flattering styles"
  };

  // 🏗️ CONSTRUIR PROMPT COMPLETO
  let enhancedPrompt = `${magazinePrompts[magazineStyle]}, `;
  
  // Agregar contexto base
  enhancedPrompt += `${basePrompt}, `;
  
  // Agregar estilo de fotografía
  enhancedPrompt += `${shootStyles[shootType]}, `;
  
  // Agregar colores estacionales
  const currentSeason = seasons[0] || "actual";
  enhancedPrompt += `${seasonalColors[currentSeason as keyof typeof seasonalColors]}, `;
  
  // Agregar ocasión
  const currentOccasion = occasions[0] || "versatil";
  enhancedPrompt += `${occasionStyles[currentOccasion as keyof typeof occasionStyles]}, `;
  
  // Agregar contexto cultural
  enhancedPrompt += `${culturalContext[targetMarket]}, `;
  
  // 🎯 ESPECIFICACIONES TÉCNICAS PROFESIONALES
  const technicalSpecs = [
    "professional fashion photography",
    "high resolution 4K quality", 
    "perfect lighting setup",
    "detailed fabric textures",
    "color-accurate reproduction",
    "magazine cover quality",
    "commercial photography standards",
    "trend-forward styling",
    "impeccable attention to detail",
    "fashion-forward composition"
  ];
  
  enhancedPrompt += technicalSpecs.join(", ");

  // 🚫 EXCLUSIONES PARA MEJOR CALIDAD
  const negativePrompts = [
    "low quality",
    "blurry", 
    "distorted",
    "amateur photography",
    "poor lighting",
    "unflattering angles",
    "cheap materials"
  ];
  
  enhancedPrompt += `. Avoid: ${negativePrompts.join(", ")}`;

  // 🚀 OPTIMIZACIONES ESPECÍFICAS PARA FLUX.1-dev
  if (enhanceForFlux) {
    const fluxOptimizations = getFluxOptimizations(fluxModel, magazineStyle);
    enhancedPrompt += `, ${fluxOptimizations}`;
  }

  log(`🎨 Prompt generado para estilo ${magazineStyle} con FLUX-${fluxModel}: ${enhancedPrompt.substring(0, 100)}...`, "fashion-prompt");
  
  return enhancedPrompt;
}

/**
 * 🎭 Prompts pre-definidos para diferentes tipos de contenido
 */
export const FASHION_PROMPT_TEMPLATES = {
  // 👗 MODA FEMENINA
  vestidoElegante: "Elegant evening dress on sophisticated model, luxury fabric with perfect drape, refined silhouette",
  
  conjuntoCasual: "Chic casual ensemble, comfortable yet stylish, perfect for everyday elegance",
  
  trajeNegocios: "Professional business suit, empowering feminine style, modern workplace fashion",
  
  lookBohemio: "Bohemian-inspired outfit, free-spirited fashion, artistic and unconventional style",
  
  // 👔 MODA MASCULINA  
  trajeFormal: "Sophisticated men's formal suit, impeccable tailoring, classic masculine elegance",
  
  casualMasculino: "Contemporary men's casual wear, relaxed sophistication, modern gentleman style",
  
  // 👫 UNISEX
  estilo90s: "90s-inspired fashion, nostalgic styling, retro modern aesthetic",
  
  minimalista: "Minimalist fashion design, clean lines, understated elegance, modern simplicity",
  
  // 🏖️ ESTACIONAL
  verano: "Summer fashion collection, light fabrics, breathable materials, warm weather styling",
  
  invierno: "Winter fashion ensemble, layered styling, warm textures, cold weather elegance",
  
  // 🎉 OCASIONES ESPECIALES
  boda: "Wedding guest fashion, celebration attire, elegant formal wear",
  
  graduacion: "Graduation ceremony outfit, milestone celebration fashion, proud moment styling",
  
  nocheVieja: "New Year's Eve party fashion, glamorous celebration wear, festive elegance"
};

/**
 * 🤖 Generador inteligente basado en palabras clave
 */
export function generateSmartPrompt(keywords: string[], context: FashionContext): string {
  // Analizar keywords para determinar el mejor template
  const keywordMap = {
    vestido: 'vestidoElegante',
    casual: 'conjuntoCasual', 
    trabajo: 'trajeNegocios',
    bohemio: 'lookBohemio',
    formal: 'trajeFormal',
    hombre: 'casualMasculino',
    minimalista: 'minimalista',
    verano: 'verano',
    invierno: 'invierno',
    boda: 'boda'
  };
  
  // Encontrar el template más relevante
  let selectedTemplate = 'conjuntoCasual'; // default
  
  for (const keyword of keywords) {
    const lowerKeyword = keyword.toLowerCase();
    for (const [key, template] of Object.entries(keywordMap)) {
      if (lowerKeyword.includes(key)) {
        selectedTemplate = template;
        break;
      }
    }
  }
  
  const basePrompt = FASHION_PROMPT_TEMPLATES[selectedTemplate as keyof typeof FASHION_PROMPT_TEMPLATES];
  
  return generateMagazineStylePrompt(basePrompt, context);
}

/**
 * 🎯 Optimizar prompt para mercado mexicano/latinoamericano
 */
export function optimizeForLatinMarket(prompt: string): string {
  const latinEnhancements = [
    "warm climate appropriate",
    "vibrant color palette", 
    "cultural elegance",
    "Latin American fashion sensibility",
    "tropical styling considerations",
    "colorful and expressive",
    "warm weather fashion",
    "festive and celebratory aesthetic"
  ];
  
  return `${prompt}, ${latinEnhancements.join(", ")}`;
}

/**
 * 📊 Generar múltiples variaciones de un prompt
 */
export function generatePromptVariations(basePrompt: string, count: number = 3): string[] {
  const variations = [];
  const styles = ['vogue', 'cosmopolitan', 'elle'] as const;
  const shoots = ['editorial', 'studio', 'street'] as const;
  
  for (let i = 0; i < count; i++) {
    const context: FashionContext = {
      magazineStyle: styles[i % styles.length],
      shootType: shoots[i % shoots.length],
      targetMarket: 'mexico',
      enhanceForFlux: true
    };
    
    variations.push(generateMagazineStylePrompt(basePrompt, context));
  }
  
  return variations;
}

/**
 * 🚀 OPTIMIZACIONES ESPECÍFICAS PARA FLUX.1-dev
 * Terminología y configuraciones que funcionan mejor con cada modelo FLUX
 */
function getFluxOptimizations(fluxModel: string, magazineStyle: string): string {
  // Términos que FLUX.1-dev entiende excepcionalmente bien
  const fluxCore = [
    "ultra-detailed",
    "photorealistic",
    "high-end commercial photography",
    "professional fashion model",
    "perfect fabric rendering",
    "detailed textile textures",
    "accurate color reproduction",
    "fashion magazine quality",
    "studio-grade lighting",
    "impeccable styling"
  ];

  // Optimizaciones por modelo
  const modelOptimizations = {
    "flux-schnell": [
      "clean composition",
      "sharp focus",
      "vibrant colors",
      "clear details"
    ],
    "flux-dev": [
      "sophisticated composition",
      "nuanced lighting",
      "detailed fabric textures",
      "editorial quality",
      "professional photography standards",
      "magazine cover worthy"
    ],
    "flux-pro": [
      "ultra-high resolution",
      "museum-quality photography",
      "luxury fashion editorial",
      "artistic composition",
      "masterpiece quality",
      "award-winning photography",
      "gallery-worthy fashion portrait"
    ]
  };

  // Optimizaciones por estilo de revista
  const magazineOptimizations = {
    "vogue": [
      "haute couture",
      "avant-garde fashion",
      "artistic vision",
      "luxury aesthetic"
    ],
    "cosmopolitan": [
      "contemporary fashion",
      "accessible luxury",
      "modern woman",
      "empowering style"
    ],
    "elle": [
      "chic elegance",
      "French sophistication",
      "timeless style",
      "refined aesthetic"
    ],
    "gq": [
      "masculine sophistication",
      "gentleman style",
      "contemporary menswear",
      "refined masculinity"
    ]
  };

  // Combinar optimizaciones
  const modelTerms = modelOptimizations[fluxModel as keyof typeof modelOptimizations] || modelOptimizations["flux-dev"];
  const magazineTerms = magazineOptimizations[magazineStyle as keyof typeof magazineOptimizations] || [];
  
  // FLUX-specific technical terms que mejoran la calidad
  const fluxTechnical = [
    "FLUX.1 optimized",
    "diffusion model excellence",
    "state-of-the-art AI generation",
    "neural network precision",
    "advanced prompt understanding",
    "high-fidelity rendering"
  ];

  const allOptimizations = [
    ...fluxCore,
    ...modelTerms,
    ...magazineTerms,
    ...fluxTechnical
  ];

  return allOptimizations.join(", ");
}

/**
 * 🎯 Genera prompt específicamente optimizado para FLUX.1-dev
 */
export function generateFluxOptimizedPrompt(
  basePrompt: string,
  fluxModel: "flux-schnell" | "flux-dev" | "flux-pro" = "flux-dev",
  fashionStyle: string = "editorial"
): string {
  const context: FashionContext = {
    magazineStyle: "vogue",
    shootType: "editorial",
    targetMarket: "mexico",
    fluxModel,
    enhanceForFlux: true
  };

  return generateMagazineStylePrompt(basePrompt, context);
}

/**
 * 🔥 PROMPTS DE ALTA CALIDAD ESPECÍFICOS PARA FLUX.1-dev
 */
export const FLUX_FASHION_PROMPTS = {
  // Optimizados para FLUX-dev
  elegantDress: "Elegant evening gown on sophisticated fashion model, flowing silk fabric with perfect drape, studio lighting, editorial photography, ultra-detailed, FLUX.1-dev optimized",
  
  casualChic: "Contemporary casual ensemble, relaxed sophistication, natural textures, lifestyle photography, detailed fabric rendering, modern fashion aesthetic, FLUX.1 excellence",
  
  businessAttire: "Professional business suit, empowering style, sharp tailoring, confident pose, commercial photography standards, detailed textile textures, FLUX.1-dev precision",
  
  bohemianStyle: "Bohemian-inspired outfit, free-spirited fashion, artistic composition, natural lighting, detailed fabric textures, contemporary boho aesthetic, FLUX.1 optimized",
  
  luxuryFashion: "High-end luxury fashion, haute couture quality, museum-grade photography, impeccable styling, ultra-high resolution, masterpiece quality, FLUX.1-pro excellence"
};