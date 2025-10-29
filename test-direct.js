// Test directo de la API de Gemini sin variables de entorno problemáticas
import { GoogleGenerativeAI } from "@google/generative-ai";

async function testGeminiDirectly() {
    console.log("🧪 Probando conectividad DIRECTA con API de Gemini...");
    
    // API key directa (modo YOLO)
    const apiKey = "AIzaSyAKoywngiGZdb678cAGJSaqGOJQJmpjIIM";
    
    console.log("✅ Usando API Key directa:", apiKey.substring(0, 10) + "...");
    console.log("🔍 Longitud de la API Key:", apiKey.length);
    console.log("🔍 Formato de la API Key:", apiKey.startsWith('AIza') ? "✅ Formato correcto" : "❌ Formato incorrecto");
    
    if (!apiKey.startsWith('AIza')) {
        console.error("❌ La API Key debe comenzar con 'AIza'");
        return false;
    }
    
    if (apiKey.length < 30) {
        console.error("❌ La API Key parece estar incompleta (muy corta)");
        return false;
    }
    
    try {
        // Inicializar cliente
        const genAI = new GoogleGenerativeAI(apiKey);
        
        console.log("🔗 Listando modelos disponibles...");
        
        // Primero, listar modelos disponibles
        try {
            const models = await genAI.listModels();
            console.log("📋 Modelos disponibles:");
            models.forEach(model => {
                console.log(`  - ${model.name}`);
            });
        } catch (listError) {
            console.log("ℹ️ No se pudieron listar modelos, probando modelos comunes...");
        }
        
        // Probar diferentes modelos
        const modelsToTry = [
            "gemini-1.5-flash",
            "gemini-pro",
            "gemini-1.5-pro",
            "gemini-pro-vision",
            "models/gemini-1.5-flash",
            "models/gemini-pro"
        ];
        
        let workingModel = null;
        
        for (const modelName of modelsToTry) {
            try {
                console.log(`🧪 Probando modelo: ${modelName}...`);
                const model = genAI.getGenerativeModel({ model: modelName });
                
                const prompt = "Hola, di simplemente 'funciono'";
                const result = await model.generateContent(prompt);
                const response = await result.response;
                const text = response.text();
                
                console.log(`✅ ¡Modelo ${modelName} funciona!`);
                console.log(`� Respuesta: ${text}`);
                workingModel = modelName;
                break;
            } catch (modelError) {
                console.log(`❌ Modelo ${modelName} falló: ${modelError.message.substring(0, 100)}...`);
            }
        }
        
        if (!workingModel) {
            throw new Error("Ningún modelo funcionó");
        }
        
        // Usar el modelo que funciona para la prueba de moda
        const model = genAI.getGenerativeModel({ model: workingModel });
        
        console.log(`\n🎨 Usando modelo ${workingModel} para prueba de moda...`);
        
        // Hacer una prueba simple de moda
        const prompt = "Describe un outfit elegante para una mujer de negocios exitosa en México";
        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();
        
        console.log("🎉 ¡Conexión exitosa!");
        console.log("👗 Respuesta de moda:", text.substring(0, 200) + "...");
        
        // Ahora probar una descripción más específica para generación de imágenes
        console.log("\n🎨 Probando generación de descripción para imágenes...");
        
        const fashionPrompt = `Actúa como diseñador de moda profesional. 
        Describe detalladamente para generar una imagen de: "Vestido elegante para cena de gala".
        Incluye: colores específicos, texturas, accesorios, iluminación para foto de revista.`;
        
        const fashionResult = await model.generateContent(fashionPrompt);
        const fashionResponse = await fashionResult.response;
        const fashionText = fashionResponse.text();
        
        console.log("✨ Descripción de moda generada:", fashionText.substring(0, 300) + "...");
        
        return true;
    } catch (error) {
        console.error("❌ Error al conectar con Gemini:", error.message);
        
        if (error.message.includes('API_KEY_INVALID')) {
            console.log("💡 La API Key parece ser inválida. Verifica que sea correcta.");
        } else if (error.message.includes('QUOTA_EXCEEDED')) {
            console.log("💡 Se agotó la cuota de la API. Verifica tu plan de Google AI Studio.");
        } else {
            console.log("💡 Error:", error.message);
        }
        
        return false;
    }
}

// Ejecutar el test
testGeminiDirectly()
    .then((success) => {
        if (success) {
            console.log("\n🚀 ¡TEST EXITOSO! Tu API de Gemini está funcionando perfectamente");
            console.log("🎯 Ahora vamos a integrarla en FashionistApp para generar imágenes estilo VOGUE");
        } else {
            console.log("\n❌ Test falló - revisar configuración");
        }
        process.exit(success ? 0 : 1);
    })
    .catch((error) => {
        console.error("💥 Error inesperado:", error);
        process.exit(1);
    });