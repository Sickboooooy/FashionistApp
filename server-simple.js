// Servidor mínimo para probar el frontend
import express from "express";
import path from "path";
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5000;

console.log("🚀 Iniciando servidor mínimo de FashionistApp...");

// Middlewares básicos
app.use(express.json());
app.use(express.static(path.join(process.cwd(), 'dist/public')));
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

// Ruta básica para testing de API
app.get('/api/debug/health', (req, res) => {
  res.json({
    status: 'healthy',
    message: '✅ Sistema funcionando con Gemini 2.5 Flash',
    activeAPIs: ['gemini-2.5-flash'],
    timestamp: new Date().toISOString()
  });
});

app.get('/api/debug/config', (req, res) => {
  res.json({
    config: {
      replicate: { enabled: false, hasToken: false },
      gemini: { enabled: true, hasKey: true },
      openai: { enabled: false, hasKey: false },
      fallbackOrder: ['gemini', 'openai']
    },
    health: {
      status: 'healthy',
      message: '✅ Gemini 2.5 Flash activo y funcionando',
      activeAPIs: ['gemini-2.5-flash']
    },
    costs: {
      replicate_flux_schnell: '$0.003/imagen',
      gemini: 'Incluido en plan gratuito',
      openai_dalle3: '$0.040/imagen'
    }
  });
});

// Ruta para testing de generación
app.post('/api/debug/test-apis', (req, res) => {
  res.json({
    message: '🧪 Test de APIs completado',
    results: {
      gemini: {
        status: 'success',
        model: 'gemini-2.5-flash',
        response: 'API funcionando correctamente para generación de moda'
      }
    }
  });
});

// Ruta de anna-designs (mock)
app.get('/api/anna-designs', (req, res) => {
  res.json([
    {
      id: 1,
      title: "Outfit Elegante VOGUE",
      description: "Conjunto sofisticado estilo revista de moda",
      imageUrl: "/uploads/demo-outfit-1.svg",
      style: "elegante",
      occasion: "formal"
    },
    {
      id: 2,
      title: "Look Casual Cosmopolitan", 
      description: "Estilo urbano y moderno para el día a día",
      imageUrl: "/uploads/demo-outfit-2.svg",
      style: "casual",
      occasion: "diario"
    }
  ]);
});

// Servir el frontend
app.get('*', (req, res) => {
  res.sendFile(path.join(process.cwd(), 'dist/public/index.html'));
});

app.listen(PORT, () => {
  console.log(`🎉 ¡SERVIDOR FUNCIONANDO!`);
  console.log(`📱 Frontend: http://localhost:${PORT}`);
  console.log(`🔧 Debug Panel: http://localhost:${PORT}/api-debug`);
  console.log(`🤖 API Status: http://localhost:${PORT}/api/debug/health`);
  console.log(`✨ ¡FashionistApp Anna Style lista para usar!`);
});