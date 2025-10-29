// Script simple para probar la conectividad de la API de Gemini
import dotenv from 'dotenv';
import { GoogleGenerativeAI } from "@google/generative-ai";

// Cargar variables de entorno (forzar recarga)
dotenv.config({ override: true });

async function testGeminiAPI() {
    console.log("🧪 Probando conectividad con API de Gemini...");
    
    const apiKey = process.env.GEMINI2APIKEY;
    
    if (!apiKey) {
        console.error("❌ API Key de Gemini no encontrada en .env");
        console.log("Verifica que GEMINI2APIKEY esté configurada en el archivo .env");
        return;
    }
    
    console.log("✅ API Key encontrada:", apiKey.substring(0, 10) + "...");
    console.log("🔍 Longitud de la API Key:", apiKey.length);
    console.log("🔍 Formato de la API Key:", apiKey.startsWith('AIza') ? "✅ Formato correcto" : "❌ Formato incorrecto");
    
    // Verificar que la API key tenga el formato correcto
    if (!apiKey.startsWith('AIza')) {
        console.error("❌ La API Key debe comenzar con 'AIza'");
        console.log("💡 Verifica que hayas copiado la API key completa de Google AI Studio");
        return false;
    }
    
    if (apiKey.length < 30) {
        console.error("❌ La API Key parece estar incompleta (muy corta)");
        console.log("💡 Una API key típica de Google tiene 39+ caracteres");
        return false;
    }
    
    try {
        // Inicializar cliente
        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
        
        console.log("🔗 Conectando con Gemini...");
        
        // Hacer una prueba simple
        const prompt = "Describe brevemente qué es la moda";
        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();
        
        console.log("🎉 ¡Conexión exitosa!");
        console.log("📝 Respuesta de prueba:", text.substring(0, 100) + "...");
        
        return true;
    } catch (error) {
        console.error("❌ Error al conectar con Gemini:", error.message);
        
        if (error.message.includes('API_KEY_INVALID')) {
            console.log("💡 La API Key parece ser inválida. Verifica que sea correcta.");
        } else if (error.message.includes('QUOTA_EXCEEDED')) {
            console.log("💡 Se agotó la cuota de la API. Verifica tu plan de Google AI Studio.");
        } else {
            console.log("💡 Error desconocido. Verifica tu conexión a internet y la API Key.");
        }
        
        return false;
    }
}

// Ejecutar el test
testGeminiAPI()
    .then((success) => {
        if (success) {
            console.log("\n✅ Test completado exitosamente");
            console.log("🚀 Tu API de Gemini está lista para usar en FashionistApp");
        } else {
            console.log("\n❌ Test falló");
            console.log("🔧 Revisa la configuración antes de continuar");
        }
        process.exit(success ? 0 : 1);
    })
    .catch((error) => {
        console.error("💥 Error inesperado:", error);
        process.exit(1);
    });