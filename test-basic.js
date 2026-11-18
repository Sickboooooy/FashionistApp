// Test básico de conectividad con Google AI
import "dotenv/config";
import { GoogleGenerativeAI } from "@google/generative-ai";

async function basicGeminiTest() {
    console.log("🔐 Verificando API Key de Google AI...");
    
    const apiKey = process.env.GEMINI2APIKEY ?? "";
    
    // No imprimir fragmentos ni longitud de la llave (CodeQL: clear-text logging)
    console.log("🔍 API Key cargada desde .env:", apiKey ? "sí" : "no (define GEMINI2APIKEY)");
    
    try {
        const genAI = new GoogleGenerativeAI(apiKey);
        
        console.log("🌐 Intentando conectar con la API...");
        
        // Usar fetch directo para probar la API
        const response = await fetch('https://generativelanguage.googleapis.com/v1/models?key=' + apiKey);
        
        console.log("📡 Status de respuesta:", response.status);
        console.log("📋 Headers:", [...response.headers.entries()]);
        
        if (!response.ok) {
            const errorText = await response.text();
            console.log("❌ Error response:", errorText);
            
            if (response.status === 403) {
                console.log("🔒 Error 403: La API key no tiene permisos o no es válida");
                console.log("💡 Verifica que la API key sea correcta y tenga acceso habilitado");
                console.log("🔗 Ve a: https://aistudio.google.com/app/apikey");
            } else if (response.status === 404) {
                console.log("🔍 Error 404: Endpoint no encontrado");
                console.log("💡 Podría ser un problema de región o configuración de la API");
            }
            return false;
        }
        
        const data = await response.json();
        console.log("✅ ¡Conexión exitosa!");
        console.log("📋 Modelos disponibles:");
        
        if (data.models && Array.isArray(data.models)) {
            data.models.forEach(model => {
                console.log(`  ✨ ${model.name}`);
            });
            
            // Probar el primer modelo disponible
            if (data.models.length > 0) {
                const firstModel = data.models[0];
                console.log(`\n🧪 Probando modelo: ${firstModel.name}`);
                
                try {
                    const model = genAI.getGenerativeModel({ model: firstModel.name });
                    const result = await model.generateContent("Di hola en español");
                    const response = await result.response;
                    const text = response.text();
                    
                    console.log("🎉 ¡Generación exitosa!");
                    console.log("📝 Respuesta:", text);
                    return true;
                } catch (modelError) {
                    console.log("❌ Error probando el modelo:", modelError.message);
                    return false;
                }
            }
        } else {
            console.log("⚠️ No se encontraron modelos en la respuesta");
            console.log("📄 Respuesta completa:", JSON.stringify(data, null, 2));
        }
        
        return true;
        
    } catch (error) {
        console.error("💥 Error general:", error.message);
        
        if (error.message.includes('fetch')) {
            console.log("🌐 Problema de conectividad - verifica tu conexión a internet");
        }
        
        return false;
    }
}

basicGeminiTest()
    .then((success) => {
        console.log(success ? "\n✅ TEST COMPLETADO" : "\n❌ TEST FALLÓ");
        process.exit(success ? 0 : 1);
    })
    .catch((error) => {
        console.error("💥 Error crítico:", error);
        process.exit(1);
    });