# FashionistApp - Anna Style

## Panorama general
FashionistApp (Anna Style) es una aplicación de estilismo de moda que usa inteligencia artificial para crear recomendaciones personalizadas de atuendos. Combina análisis de imágenes, preferencias del usuario y estilismo asistido por IA para generar contenido visual con calidad de revista y sugerencias de outfits a medida.

## Arquitectura del sistema

### Frontend
- Framework: React con TypeScript
- Estilos: Tailwind CSS con paleta personalizada (modo oscuro y acentos dorados)
- Componentes UI: Radix UI y shadcn/ui con branding propio
- Gestión de estado: React Context API para outfits y preferencias
- Ruteo: Wouter para navegación en cliente
- Herramienta de build: Vite para desarrollo y empaquetado

### Backend
- Framework: Express.js con TypeScript
- Base de datos: PostgreSQL mediante Drizzle ORM
- Proveedor: Neon Database (PostgreSQL serverless)
- Carga de archivos: Multer en memoria
- Procesamiento de imágenes: Sharp para optimización
- Diseño de API: Endpoints REST con validaciones

## Integración de IA
- 🚀 IA primaria: Replicate + FLUX (generación de imágenes muy rápida y económica)
- 🤖 IA secundaria: Google Gemini (gemini-1.5-flash) para análisis de imágenes
- 🎯 Respaldo: OpenAI GPT-4o para contenido y contingencia
- 💰 Optimización de costos: Hasta 92.5% menos que OpenAI usando Replicate FLUX
- Arquitectura híbrida: Múltiples proveedores con failover inteligente
- Servicios: Capa dedicada con caché para operaciones de IA

## Componentes clave

### Servicios centrales
- Capa de IA: Orquestación híbrida entre Gemini y OpenAI
- Servicio de imágenes: Carga, optimización y almacenamiento
- Servicio de revista: Generación editorial para layouts de moda
- Servicio de caché: Optimización de rendimiento con NodeCache
- Middleware de seguridad: Helmet, rate limiting y protección XSS

### Frontend
- Contexto de outfits: Estado global para generación y visualización
- Contexto de preferencias: Configuraciones de estilo del usuario
- Sistema UI: Componentes personalizados con temática dorada
- Cargador de imágenes: Drag & drop con vista previa
- Vista de revista: Flujo multi-paso para contenido editorial

### Esquema de datos
- Usuarios: Autenticación y perfil
- Preferencias: Estilos, ocasiones y temporadas
- Prendas: Piezas individuales con metadatos
- Outfits: Combinaciones generadas
- Diseños Anna: Curaduría de piezas destacadas
- Viajes y maletas: Planificación de viajes y listas de empaque

## Flujo de datos
- Carga de imagen: El usuario sube una prenda → Multer procesa → Sharp optimiza → Gemini analiza
- Generación de outfit: Resultados del análisis + preferencias → OpenAI genera combinaciones → Se cachea
- Creación de revista: Se seleccionan outfits → La IA produce contenido editorial → Exportable a PDF
- Búsqueda de productos: Piezas sugeridas → Integración con APIs externas para compra

## Dependencias externas

### Servicios de IA
- Google Generative AI: Análisis de imagen y contenido principal
- OpenAI API: Servicio de respaldo especializado
- Claves requeridas: `GEMINI2APIKEY`, `OPENAI_API_KEY`

### Base de datos y almacenamiento
- Neon Database: Hosting PostgreSQL serverless
- Almacenamiento local: Directorio `uploads` para gestión de imágenes

### Integraciones de terceros
- Stripe: Cobro para funciones premium
- React Query: Manejo de estado del servidor y caché
- Font Awesome: Librería de iconos para la UI

## Estrategia de despliegue

### Configuración de entornos
- Desarrollo: Vite dev server en local
- Producción: ESBuild para el servidor, Vite para el cliente
- Base de datos: Migraciones con `db:push`
- Variables de entorno: `DATABASE_URL` y llaves de IA

### Proceso de build
- Cliente: Vite genera archivos en `dist/public`
- Servidor: ESBuild compila TypeScript a `dist`
- Assets estáticos: Servidos desde `uploads`
- Seguridad: Helmet con cabeceras endurecidas para producción

### Optimización de rendimiento
- Optimización de imágenes con Sharp
- Middleware de compresión de respuestas
- Servicio de caché para resultados de IA
- Rate limiting para proteger la API

## Tareas Pendientes

### ✅ Completadas

- ✅ Configuración de APIs de generación de imágenes (Replicate, Gemini, OpenAI)
- ✅ Sistema de logging mejorado para debugging
- ✅ Build y compilación del proyecto

### 🔄 En Progreso

- 🔄 Debug del endpoint `/api/debug/health` - Investigando fallas intermitentes en health checks

### 📋 Por Hacer

- [ ] Verificar funcionalidad completa del endpoint `/api/generate-fashion-image`
- [ ] Asegurar que la generación de imágenes con IA funcione correctamente
- [ ] Pruebas end-to-end de generación de outfits
- [ ] Optimización de costos con Replicate FLUX
- [ ] Documentación de endpoints de API
- [ ] Tests unitarios para servicios de IA

## Registro de cambios

- 01 de noviembre de 2025: Configuración de APIs de IA y debug de servicios
- 04 de julio de 2025: Configuración inicial

## Preferencias del equipo

- Estilo de comunicación preferido: Lenguaje simple y cotidiano.

