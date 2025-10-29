/**
 * 🔧 CONFIGURACIÓN DE APIs PARA GENERACIÓN DE IMÁGENES
 * Sistema centralizado para manejar múltiples proveedores de IA
 */

import { log } from "../vite";

export interface APIConfig {
  // Replicate (Recomendado - Ultra económico)
  replicate?: {
    token: string;
    enabled: boolean;
    models: {
      flux_schnell: string; // Más rápido y barato
      flux_dev: string;     // Mejor calidad
      flux_pro: string;     // Premium
    };
  };
  
  // Google AI Studio / Gemini
  gemini?: {
    apiKey: string;
    enabled: boolean;
    model: string;
  };
  
  // OpenAI (Más caro pero confiable)
  openai?: {
    apiKey: string;
    enabled: boolean;
    model: string;
  };
  
  // Configuración de fallbacks
  fallbackOrder: ('replicate' | 'gemini' | 'openai')[];
}

/**
 * 🚀 Configuración optimizada para FashionistApp
 */
export function getAPIConfig(): APIConfig {
  const config: APIConfig = {
    // 💎 REPLICATE - LA JOYA DE LA CORONA (92.5% más barato)
    replicate: {
      token: process.env.REPLICATE_API_TOKEN || "",
      enabled: Boolean(process.env.REPLICATE_API_TOKEN),
      models: {
        flux_schnell: "f2ab8a5569070ad0648a80556174f55c5e7bf6f5ca4ac2200e87a81b5db3cf80", // $0.003 por imagen
        flux_dev: "5599ed30703defd1d160a25a63321b4dec97101d98b4674bcc56e41f62f35637",    // $0.055 por imagen
        flux_pro: "7437abc57c7e8a53ba7a3bb6e99dc26b887b31eaa02aba03b7b7c6f4c6b9e5b1"     // $0.15 por imagen
      }
    },
    
    // 🤖 GEMINI - Respaldo sólido y rápido
    gemini: {
      apiKey: process.env.GEMINI2APIKEY || "",
      enabled: Boolean(process.env.GEMINI2APIKEY),
      model: "gemini-1.5-flash" // Más rápido para descripciones
    },
    
    // 🔄 OPENAI - Fallback confiable (más caro)
    openai: {
      apiKey: process.env.OPENAI_API_KEY || "",
      enabled: Boolean(process.env.OPENAI_API_KEY),
      model: "dall-e-3" // Mejor calidad pero $0.040-$0.120 por imagen
    },
    
    // 📊 Orden de preferencia: económico → rápido → confiable
    fallbackOrder: ['replicate', 'gemini', 'openai']
  };
  
  // Log de estado de APIs
  logAPIStatus(config);
  
  return config;
}

/**
 * 📊 Log del estado de las APIs
 */
function logAPIStatus(config: APIConfig): void {
  log("🔧 Estado de APIs para generación de imágenes:", "api-config");
  
  // Replicate
  if (config.replicate?.enabled) {
    log("✅ Replicate FLUX: ACTIVO (Recomendado - Ultra económico)", "api-status");
  } else {
    log("❌ Replicate FLUX: INACTIVO (Configure REPLICATE_API_TOKEN)", "api-warning");
  }
  
  // Gemini
  if (config.gemini?.enabled) {
    log("✅ Google Gemini: ACTIVO (Respaldo confiable)", "api-status");
  } else {
    log("❌ Google Gemini: INACTIVO (Configure GEMINI2APIKEY)", "api-warning");
  }
  
  // OpenAI
  if (config.openai?.enabled) {
    log("✅ OpenAI DALL-E 3: ACTIVO (Fallback premium)", "api-status");
  } else {
    log("❌ OpenAI DALL-E 3: INACTIVO (Configure OPENAI_API_KEY)", "api-warning");
  }
  
  // Contar APIs activas
  const activeAPIs = config.fallbackOrder.filter(api => {
    switch(api) {
      case 'replicate': return config.replicate?.enabled;
      case 'gemini': return config.gemini?.enabled; 
      case 'openai': return config.openai?.enabled;
      default: return false;
    }
  });
  
  if (activeAPIs.length === 0) {
    log("🚨 CRÍTICO: Ninguna API de generación activa - Solo modo demo disponible", "api-critical");
  } else {
    log(`🎯 APIs activas: ${activeAPIs.length}/${config.fallbackOrder.length} - Orden: ${activeAPIs.join(' → ')}`, "api-info");
  }
}

/**
 * 💰 Calculadora de costos estimados
 */
export function calculateImageCosts(): {[key: string]: string} {
  return {
    replicate_flux_schnell: "$0.003 por imagen (Recomendado)",
    replicate_flux_dev: "$0.055 por imagen (Mejor calidad)",
    replicate_flux_pro: "$0.15 por imagen (Premium)",
    gemini: "Incluido en plan gratuito/premium",
    openai_dalle3: "$0.040-$0.120 por imagen (Más caro)"
  };
}

/**
 * 🎯 Recomendación de configuración para producción
 */
export function getRecommendedSetup(): string {
  return `
🎯 CONFIGURACIÓN RECOMENDADA PARA FASHIONISTAPP:

1. 💎 PRIORIDAD: Replicate FLUX-Schnell
   - Ultra económico: $0.003 por imagen
   - Velocidad: 2-5 segundos
   - Calidad: Excelente para fashion
   - Setup: Configure REPLICATE_API_TOKEN

2. 🤖 RESPALDO: Google Gemini 1.5-Flash  
   - Incluido en plan gratuito
   - Genera descripciones detalladas
   - Setup: Configure GEMINI2APIKEY

3. 🔄 FALLBACK: OpenAI DALL-E 3
   - Máxima calidad pero costoso
   - Solo para casos críticos
   - Setup: Configure OPENAI_API_KEY

💰 AHORRO ESTIMADO: 92.5% vs solo OpenAI
📈 ESCALABILIDAD: Replicate maneja miles de imágenes/día
🎨 CALIDAD: Perfecto para moda y revistas
  `;
}

/**
 * 🚨 Sistema de alertas para APIs faltantes
 */
export function checkAPIHealth(): {
  status: 'healthy' | 'warning' | 'critical';
  message: string;
  recommendations: string[];
} {
  const config = getAPIConfig();
  const activeAPIs = config.fallbackOrder.filter(api => {
    switch(api) {
      case 'replicate': return config.replicate?.enabled;
      case 'gemini': return config.gemini?.enabled;
      case 'openai': return config.openai?.enabled;
      default: return false;
    }
  });
  
  if (activeAPIs.length === 0) {
    return {
      status: 'critical',
      message: '🚨 Ninguna API de generación activa',
      recommendations: [
        'Configure REPLICATE_API_TOKEN para acceso económico',
        'Configure GEMINI2APIKEY como respaldo',
        'Configure OPENAI_API_KEY como fallback premium'
      ]
    };
  }
  
  if (!config.replicate?.enabled) {
    return {
      status: 'warning', 
      message: '⚠️ Replicate no configurado - Perdiendo 92.5% de ahorro',
      recommendations: [
        'Configure REPLICATE_API_TOKEN para máximo ahorro',
        'Aproveche $0.003 por imagen vs $0.040+ en OpenAI'
      ]
    };
  }
  
  return {
    status: 'healthy',
    message: '✅ Sistema de generación óptimo',
    recommendations: [
      'Configuración ideal para producción',
      'Costos minimizados con máxima calidad'
    ]
  };
}