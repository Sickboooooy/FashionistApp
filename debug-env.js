console.log("🔍 Debug de variables de entorno");
console.log("======================================");

// Leer el archivo .env directamente
import fs from 'fs';
const envContent = fs.readFileSync('.env', 'utf8');
console.log("📁 Contenido del archivo .env:");
console.log(envContent);
console.log("======================================");

// Cargar con dotenv
import dotenv from 'dotenv';
dotenv.config({ override: true });

console.log("🔧 Variables de entorno cargadas:");
console.log("GEMINI2APIKEY:", process.env.GEMINI2APIKEY);
console.log("NODE_ENV:", process.env.NODE_ENV);
console.log("======================================");

// Buscar la línea específica en el archivo
const lines = envContent.split('\n');
const geminiLine = lines.find(line => line.startsWith('GEMINI2APIKEY='));
console.log("🎯 Línea de GEMINI2APIKEY encontrada:", geminiLine);

if (geminiLine) {
    const key = geminiLine.split('=')[1];
    console.log("🔑 API Key extraída:", key);
    console.log("📏 Longitud:", key?.length);
    console.log("✅ Formato correcto:", key?.startsWith('AIza'));
}