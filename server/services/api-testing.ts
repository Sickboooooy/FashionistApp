/**
 * 🔍 SISTEMA DE DEBUGGING Y MONITOREO PARA APIS
 * Herramientas para diagnosticar problemas con generación de imágenes
 */

import { getAPIConfig, checkAPIHealth } from "./api-config";
import { generateFashionImageWithReplicate } from "./replicate-service";
import { log } from "../vite";

export interface APITestResult {
  provider: string;
  success: boolean;
  responseTime: number;
  error?: string;
  details?: any;
}

/**
 * 🧪 Test completo de todas las APIs disponibles
 */
export async function runCompleteAPITest(): Promise<{
  summary: {
    total: number;
    passed: number;
    failed: number;
    averageResponseTime: number;
  };
  results: APITestResult[];
  recommendations: string[];
}> {
  log("🧪 Iniciando test completo de APIs de generación...", "api-test");
  
  const config = getAPIConfig();
  const results: APITestResult[] = [];
  
  // Test Replicate
  if (config.replicate?.enabled) {
    results.push(await testReplicate());
  } else {
    results.push({
      provider: "Replicate",
      success: false,
      responseTime: 0,
      error: "API Token no configurado"
    });
  }
  
  // Test Gemini
  if (config.gemini?.enabled) {
    results.push(await testGemini());
  } else {
    results.push({
      provider: "Gemini",
      success: false,
      responseTime: 0,
      error: "API Key no configurado"
    });
  }
  
  // Test OpenAI
  if (config.openai?.enabled) {
    results.push(await testOpenAI());
  } else {
    results.push({
      provider: "OpenAI",
      success: false,
      responseTime: 0,
      error: "API Key no configurado"
    });
  }
  
  // Calcular estadísticas
  const passed = results.filter(r => r.success).length;
  const failed = results.length - passed;
  const avgResponseTime = results
    .filter(r => r.success)
    .reduce((sum, r) => sum + r.responseTime, 0) / (passed || 1);
  
  // Generar recomendaciones
  const health = checkAPIHealth();
  const recommendations = generateRecommendations(results, health);
  
  const summary = {
    total: results.length,
    passed,
    failed,
    averageResponseTime: Math.round(avgResponseTime)
  };
  
  log(`📊 Test completado: ${passed}/${results.length} APIs funcionando`, "api-test-summary");
  
  return { summary, results, recommendations };
}

/**
 * 🚀 Test específico para Replicate
 */
async function testReplicate(): Promise<APITestResult> {
  const startTime = Date.now();
  
  try {
    log("🚀 Testing Replicate FLUX...", "replicate-test");
    
    // Test simple con prompt básico
    const testPrompt = "simple elegant dress, fashion photography";
    const result = await generateFashionImageWithReplicate({
      prompt: testPrompt,
      model: "flux-schnell", // El más rápido para tests
      aspectRatio: "1:1",
      outputFormat: "jpg"
    });
    
    const responseTime = Date.now() - startTime;
    
    return {
      provider: "Replicate",
      success: true,
      responseTime,
      details: {
        model: "flux-schnell",
        result: result,
        cost: "$0.003"
      }
    };
    
  } catch (error: any) {
    const responseTime = Date.now() - startTime;
    
    return {
      provider: "Replicate", 
      success: false,
      responseTime,
      error: error.message,
      details: {
        errorType: error.name,
        suggestion: "Verifica REPLICATE_API_TOKEN"
      }
    };
  }
}

/**
 * 🤖 Test específico para Gemini
 */
async function testGemini(): Promise<APITestResult> {
  const startTime = Date.now();
  
  try {
    log("🤖 Testing Google Gemini...", "gemini-test");
    
    // Importar Gemini aquí para evitar errores de inicialización
    const { GoogleGenerativeAI } = await import("@google/generative-ai");
    
    const apiKey = process.env.GEMINI2APIKEY;
    if (!apiKey) {
      throw new Error("GEMINI2APIKEY no configurado");
    }
    
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    
    // Test simple
    const result = await model.generateContent("Generate a short description for a black elegant dress");
    const response = result.response.text();
    
    const responseTime = Date.now() - startTime;
    
    return {
      provider: "Gemini",
      success: true,
      responseTime,
      details: {
        model: "gemini-1.5-flash",
        responseLength: response.length,
        cost: "Incluido en plan"
      }
    };
    
  } catch (error: any) {
    const responseTime = Date.now() - startTime;
    
    return {
      provider: "Gemini",
      success: false,
      responseTime,
      error: error.message,
      details: {
        suggestion: "Verifica GEMINI2APIKEY en Google AI Studio"
      }
    };
  }
}

/**
 * 🔄 Test específico para OpenAI
 */
async function testOpenAI(): Promise<APITestResult> {
  const startTime = Date.now();
  
  try {
    log("🔄 Testing OpenAI DALL-E 3...", "openai-test");
    
    // Importar OpenAI aquí
    const OpenAI = (await import("openai")).default;
    
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error("OPENAI_API_KEY no configurado");
    }
    
    const openai = new OpenAI({ apiKey });
    
    // Test con DALL-E 3 (más caro, solo para verificación)
    const response = await openai.images.generate({
      model: "dall-e-3",
      prompt: "A simple elegant black dress, fashion photography style",
      n: 1,
      size: "1024x1024",
      quality: "standard"
    });
    
    const responseTime = Date.now() - startTime;
    
    return {
      provider: "OpenAI",
      success: true,
      responseTime,
      details: {
        model: "dall-e-3",
        imageUrl: response.data[0]?.url,
        cost: "$0.040+"
      }
    };
    
  } catch (error: any) {
    const responseTime = Date.now() - startTime;
    
    return {
      provider: "OpenAI",
      success: false,
      responseTime,
      error: error.message,
      details: {
        suggestion: "Verifica OPENAI_API_KEY y créditos disponibles"
      }
    };
  }
}

/**
 * 📋 Generar recomendaciones basadas en resultados
 */
function generateRecommendations(results: APITestResult[], health: any): string[] {
  const recommendations: string[] = [];
  
  // Analizar cada resultado
  const replicateResult = results.find(r => r.provider === "Replicate");
  const geminiResult = results.find(r => r.provider === "Gemini");
  const openaiResult = results.find(r => r.provider === "OpenAI");
  
  // Replicate específico
  if (!replicateResult?.success) {
    recommendations.push(
      "🚀 CRÍTICO: Configure Replicate para 92.5% de ahorro en costos"
    );
    recommendations.push(
      "💡 Obtenga su API token en: https://replicate.com/account/api-tokens"
    );
  } else {
    recommendations.push(
      "✅ Replicate funcionando - Configuración óptima para producción"
    );
  }
  
  // Gemini específico
  if (!geminiResult?.success) {
    recommendations.push(
      "🤖 Configure Gemini como respaldo confiable y económico"
    );
    recommendations.push(
      "💡 Obtenga su API key en: https://aistudio.google.com/app/apikey"
    );
  }
  
  // OpenAI específico
  if (!openaiResult?.success && !replicateResult?.success && !geminiResult?.success) {
    recommendations.push(
      "🔄 Como última opción, configure OpenAI (más caro pero confiable)"
    );
  }
  
  // Recomendaciones de rendimiento
  const successfulAPIs = results.filter(r => r.success);
  if (successfulAPIs.length > 0) {
    const fastest = successfulAPIs.reduce((prev, current) => 
      prev.responseTime < current.responseTime ? prev : current
    );
    recommendations.push(
      `⚡ API más rápida: ${fastest.provider} (${fastest.responseTime}ms)`
    );
  }
  
  return recommendations;
}

/**
 * 🏥 Health check rápido
 */
export async function quickHealthCheck(): Promise<{
  status: 'healthy' | 'warning' | 'critical';
  message: string;
  activeAPIs: string[];
}> {
  const config = getAPIConfig();
  
  const activeAPIs: string[] = [];
  
  if (config.replicate?.enabled) activeAPIs.push("Replicate");
  if (config.gemini?.enabled) activeAPIs.push("Gemini");
  if (config.openai?.enabled) activeAPIs.push("OpenAI");
  
  if (activeAPIs.length === 0) {
    return {
      status: 'critical',
      message: 'Ninguna API configurada - Solo modo demo',
      activeAPIs
    };
  }
  
  if (!config.replicate?.enabled) {
    return {
      status: 'warning',
      message: 'Replicate no configurado - Perdiendo ahorro económico',
      activeAPIs
    };
  }
  
  return {
    status: 'healthy',
    message: 'Sistema funcionando óptimamente',
    activeAPIs
  };
}

/**
 * 📊 Endpoint para debug desde el frontend
 */
export async function getDebugInfo(): Promise<{
  config: any;
  health: any;
  costs: any;
  recommendations: string;
}> {
  const config = getAPIConfig();
  const health = await quickHealthCheck();
  const costs = {
    replicate_flux_schnell: "$0.003",
    replicate_flux_dev: "$0.055", 
    replicate_flux_pro: "$0.15",
    gemini: "Gratis/Premium",
    openai_dalle3: "$0.040-$0.120"
  };
  
  return {
    config: {
      replicate_enabled: config.replicate?.enabled,
      gemini_enabled: config.gemini?.enabled,
      openai_enabled: config.openai?.enabled
    },
    health,
    costs,
    recommendations: `
🎯 GUÍA DE CONFIGURACIÓN PARA FASHIONISTAPP:

1. 🥇 REPLICATE (Recomendado):
   • Más económico: $0.003 vs $0.040+ OpenAI
   • Velocidad: 2-5 segundos
   • Calidad: Excelente para fashion
   • Token: https://replicate.com/account/api-tokens

2. 🥈 GEMINI (Respaldo): 
   • Incluido en plan gratuito
   • Rápido y confiable
   • API Key: https://aistudio.google.com/app/apikey

3. 🥉 OPENAI (Fallback):
   • Máxima calidad pero costoso
   • Solo para casos críticos
   
Estado actual: ${health.activeAPIs.join(', ') || 'Ninguna API activa'}
    `
  };
}