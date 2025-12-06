# FashionistApp - Anna Style

## Panorama general
FashionistApp (Anna Style) es una aplicación de estilismo de moda que usa inteligencia artificial para crear recomendaciones personalizadas de atuendos. Combina análisis de imágenes, preferencias del usuario y estilismo asistido por IA para generar contenido visual con calidad de revista y sugerencias de outfits a medida.

## 🆕 Novedades (Diciembre 2024)

### ✅ Generación de Imágenes con IA GRATIS
- **Pollinations.ai** como proveedor primario (sin API key, 100% gratis)
- Replicate FLUX como fallback para usuarios con token
- Prompts optimizados para moda latinoamericana

### ✅ Integración de Preferencias del Usuario
- Toggle "Usar Mis Preferencias" en el generador de imágenes
- Los colores, estilos y temporadas se inyectan automáticamente en los prompts
- Visualización de preferencias activas con colores

### 🚧 Smart Inventory System (En Desarrollo)
Sistema para recomendar outfits basados en inventario real en lugar de imágenes imaginarias.

**Componentes listos:**
- [x] Tabla `products` en el esquema de base de datos
- [x] Script de seeding con 6 productos reales
- [x] Estructura de carpetas para imágenes de productos

**Pendiente:**
- [ ] Configurar DATABASE_URL en `.env`
- [ ] Copiar imágenes de productos a `client/public/products/`
- [ ] Ejecutar migración y seed
- [ ] Servicio RAG para recomendaciones
- [ ] Componentes de UI (ProductCard, OutfitRecommendation)

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

| Proveedor | Función | Costo |
|-----------|---------|-------|
| **Pollinations.ai** | Generación de imágenes (primario) | GRATIS |
| **Replicate FLUX** | Generación de imágenes (fallback) | Bajo |
| **Google Gemini** | Análisis de imágenes y descripciones | Gratis (tier) |
| **OpenAI GPT-4o** | Respaldo para contenido | Pagado |

## Componentes clave

### Servicios centrales
- `pollinations-service.ts`: Generación de imágenes gratuita
- `image-generation-service.ts`: Orquestación de proveedores de IA
- `gemini-service.ts`: Análisis de prendas con visión
- `inventory-service.ts`: (Próximamente) Consultas de inventario
- `outfit-recommendation-service.ts`: (Próximamente) RAG para outfits

### Frontend
- `ai-image-generator.tsx`: Generador con integración de preferencias
- `preference-manager.tsx`: Configuración de estilos y colores
- `ProductCard.tsx`: (Próximamente) Tarjeta de producto
- `OutfitRecommendation.tsx`: (Próximamente) Visualización de recomendaciones

### Esquema de datos
- **users**: Autenticación y perfil
- **user_preferences**: Estilos, ocasiones y temporadas
- **garments**: Piezas individuales con metadatos
- **outfits**: Combinaciones generadas
- **products**: 🆕 Inventario real para venta
- **trips/packing_lists**: Planificación de viajes

## Flujo de datos (Híbrido)

```
Usuario ingresa prompt
       ↓
┌──────────────────────────────────────┐
│  Preferencias del usuario (opcional)  │
│  + Colores + Estilos + Temporadas     │
└──────────────────────────────────────┘
       ↓
┌──────────────────────────────────────┐
│     Pollinations.ai → Imagen IA      │ (Inspiración Visual)
└──────────────────────────────────────┘
       ↓
┌──────────────────────────────────────┐
│  RAG: Inventario Real + Gemini AI    │ (Productos Reales)
│  → Recomendación de productos        │
└──────────────────────────────────────┘
       ↓
    UI muestra:
    - Imagen IA (mood/inspiración)
    - ProductCards (productos comprables)
```

## Instalación y desarrollo

```bash
# Instalar dependencias
npm install

# Iniciar desarrollo
npm run dev

# Build de producción
npm run build

# Migrar base de datos
npm run db:push

# Seed de productos (después de configurar DATABASE_URL)
npx tsx server/seedProducts.ts
```

## Variables de entorno

```env
# Base de datos (requerido)
DATABASE_URL=postgresql://...

# IA (opcional - Pollinations no requiere key)
GEMINI2APIKEY=AIza...
REPLICATE_API_TOKEN=r8_...
OPENAI_API_KEY=sk-...

# Seguridad
SESSION_SECRET=...
```

## Estrategia de despliegue

Recomendado para México/LATAM:
1. **Railway** - MVP rápido, $5/mes
2. **Render** - Balance costo/features
3. **DigitalOcean** - Producción escalable

Ver `deployment_guide.md` para detalles completos.

## Registro de cambios

- **06 de diciembre de 2024**: 
  - Implementación de Pollinations.ai para generación gratuita
  - Integración de preferencias en generador de IA
  - Inicio de Smart Inventory System (schema + seed)
- 01 de noviembre de 2025: Configuración de APIs de IA
- 04 de julio de 2025: Configuración inicial

## Contribuidores

- **Desarrollo IA y Backend**: Antigravity AI Assistant
- **Diseño y Producto**: Anna Style Team
