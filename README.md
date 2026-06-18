# 👗 FashionistApp - Anna Style

> **Estilismo de Moda con IA** | Análisis inteligente de prendas | Generación de outfits personalizados

<div align="center">

[![Build Status](https://img.shields.io/badge/build-passing-brightgreen)]()
[![License](https://img.shields.io/badge/license-MIT-blue)]()
[![Node](https://img.shields.io/badge/node-%3E%3D20-green)]()
[![React](https://img.shields.io/badge/React-18.3.1-61dafb?logo=react)]()
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8.2-3178c6?logo=typescript)]()

</div>

---

## 🎯 Descripción

**FashionistApp (Anna Style)** es una plataforma de estilismo de moda potenciada por IA que te ayuda a:

✨ **Analizar prendas** - Sube una foto y obtén descripción detallada con IA  
🎨 **Generar outfits** - Crea combinaciones personalizadas automáticamente  
📸 **Inspiración visual** - Galería de looks curados profesionalmente  
🛍️ **Gestionar inventario** - Cataloga tu guardarropa y obtén recomendaciones  
🌐 **Soporte multilenguaje** - Interfaz optimizada para usuarios latinoamericanos

---

## 🚀 Quick Start

### Requisitos
- Node.js ≥ 20
- npm o yarn
- PostgreSQL 14+ (opcional, para base de datos)

### Instalación

```bash
# Clonar repositorio
git clone https://github.com/Sickboooooy/FASHIONISTA-AI-STUDIO.git
cd FASHIONISTA-MERGED

# Instalar dependencias
npm install

# Configurar variables de entorno (ver .env.example)
cp .env.example .env.local

# Iniciar servidor de desarrollo
npm run dev
```

**La app estará disponible en**: `http://localhost:5000`

---

## 📋 Configuración de Variables de Entorno

Crea un archivo `.env` en la raíz del proyecto:

```env
# Google Gemini API
GOOGLE_API_KEY=your_gemini_api_key_here

# OpenAI (opcional, fallback)
OPENAI_API_KEY=your_openai_key_here

# Base de Datos PostgreSQL
DATABASE_URL=postgresql://user:password@localhost:5432/fashionista

# Replicate (generación de imágenes, opcional)
REPLICATE_API_TOKEN=your_replicate_token

# Stripe (pagos, opcional)
STRIPE_SECRET_KEY=your_stripe_key
STRIPE_PUBLIC_KEY=your_stripe_public_key

# Entorno
NODE_ENV=development
PORT=5000
```

---

## 🏗️ Arquitectura

```
FASHIONISTA-MERGED/
├── client/                      # Frontend React
│   ├── src/
│   │   ├── components/          # Componentes reutilizables
│   │   ├── pages/               # Páginas principales (10+)
│   │   ├── services/            # Servicios de IA (Gemini, OpenAI)
│   │   ├── contexts/            # Context API (Outfits, Preferencias)
│   │   └── lib/                 # Utilidades compartidas
│   ├── public/                  # Assets estáticos
│   ├── index.html
│   └── vite.config.ts
├── server/                      # Backend Express
│   ├── routes.ts                # Endpoints REST
│   ├── services/                # Lógica de negocio
│   ├── middleware/              # Auth, validación, logging
│   ├── types/                   # TypeScript types
│   ├── db.ts                    # Configuración Drizzle ORM
│   └── index.ts                 # Punto de entrada
├── shared/                      # Código compartido
├── package.json
├── tsconfig.json
└── README.md
```

---

## 💻 Tech Stack

| Capa | Tecnología |
|------|-----------|
| **Frontend** | React 18.3.1 + TypeScript |
| **Styling** | Tailwind CSS + Radix UI + shadcn/ui |
| **Build** | Vite 5.4.14 |
| **Backend** | Express.js + TypeScript |
| **DB** | PostgreSQL + Drizzle ORM |
| **IA** | Google Gemini + OpenAI + Pollinations.ai |
| **Autenticación** | Passport.js + Bcrypt |
| **Validación** | Zod + express-validator |

---

## 📱 Características Principales

### ✅ Análisis de Prendas (Gemini Vision)
- Sube una foto de ropa
- IA analiza: corte, tela, colores, categoría
- Generación de 3 outfits contextualizados

### ✅ Generador de Imágenes
- **Pollinations.ai** (gratis, sin API key)
- **Replicate FLUX** (fallback premium)
- Prompts optimizados para moda

### ✅ Preferencias Personalizadas
- Colores favoritos
- Estilos (casual, formal, vintage, etc.)
- Ocasiones (trabajo, salida, deporte)
- Temporadas

### ✅ Galería Curada
- 10+ inspiraciones pre-diseñadas
- Looks por ocasión
- Sistema de guardados y compartir

### ✅ Gestor de Inventario
- Catálogo de productos reales
- Recomendaciones basadas en tus prendas
- Historial de búsquedas

### 🚧 Coming Soon
- [ ] Viajes y packing lists
- [ ] Integración con e-commerce
- [ ] Análisis de tendencias
- [ ] Comunidad de estilos

---

## 📚 Scripts Disponibles

```bash
# Desarrollo
npm run dev              # Inicia backend + frontend (puerto 5000)

# Build y producción
npm run build            # Compilar frontend + backend
npm start                # Ejecutar build en producción
npm run check            # Validar tipos TypeScript

# Base de datos
npm run db:push          # Sincronizar esquema con DB

# Mantenimiento
npm audit                # Ver vulnerabilidades
npm audit fix            # Corregir vulnerabilidades
npm install --legacy-peer-deps  # Si hay conflictos de dependencias
```

---

## 🔐 Autenticación

El backend soporta:
- **Local** (email/contraseña)
- **OAuth2** (Google, GitHub)
- **Sesiones** (express-session + connect-pg-simple)

---

## 🛣️ Rutas Principales

### Frontend
| Ruta | Descripción |
|------|-----------|
| `/` | Home - Análisis de prendas |
| `/closet` | Mi armario |
| `/anna-designs` | Diseños de Anna |
| `/magazine` | Revista de moda |
| `/ai-images` | Generador de imágenes IA |
| `/product-search` | Búsqueda de productos |
| `/trips` | Gestión de viajes |
| `/profile` | Perfil de usuario |
| `/api-debug` | Panel de debug (dev only) |

### Backend API
```
POST   /api/analyze-garment       # Analizar prenda con Gemini
POST   /api/generate-images       # Generar imágenes IA
POST   /api/generate-outfit       # Generar outfit
GET    /api/products              # Listar productos
POST   /api/preferences           # Guardar preferencias
GET    /api/magazine              # Contenido de revista
```

---

## 🎨 Diseño y UX

- **Paleta**: Modo oscuro con acentos dorados (#FFB366)
- **Tipografía**: Inter + Geist
- **Componentes**: Sistema de diseño consistente
- **Responsive**: Mobile-first approach
- **Accesibilidad**: WCAG 2.1 AA

---

## 🤖 Modelos de IA Utilizados

| Proveedor | Modelo | Uso |
|-----------|--------|-----|
| **Google** | Gemini 1.5 Flash | Análisis de imágenes, descripciones |
| **Google** | Gemini 2.0 | Generación de prompts avanzada |
| **OpenAI** | GPT-4o | Fallback para contenido |
| **Pollinations** | Flux/DALL-E | Generación de imágenes (gratis) |
| **Replicate** | FLUX | Generación premium |

---

## 📊 Performance

- **Frontend**: ~50KB gzip
- **Bundle**: Tree-shaken con Vite
- **DB**: Queries optimizadas con índices
- **Images**: Sharp + WebP compression

---

## 🐛 Troubleshooting

### Puerto 5000 en uso
```bash
# Cambiar puerto
PORT=3000 npm run dev
```

### Error de base de datos
```bash
# Reiniciar conexión
npm run db:push
```

### Vulnerabilidades npm
```bash
npm audit fix --legacy-peer-deps
```

---

## 📄 Licencia

MIT © 2024 FashionistApp

---

## 🤝 Contribuir

Las contribuciones son bienvenidas. Por favor:

1. Fork el repositorio
2. Crea una rama (`git checkout -b feature/amazing-feature`)
3. Commit cambios (`git commit -m 'Add amazing feature'`)
4. Push a la rama (`git push origin feature/amazing-feature`)
5. Abre un Pull Request

---

## 📞 Soporte

- **Issues**: [GitHub Issues](https://github.com/Sickboooooy/FASHIONISTA-AI-STUDIO/issues)
- **Email**: support@fashionistapp.com
- **Discord**: [Comunidad](https://discord.gg/fashionista)

---

## ✨ Roadmap 2025

- [ ] Mobile app (React Native)
- [ ] AI Video generation
- [ ] Fashion marketplace integration
- [ ] ML-based trend prediction
- [ ] Multi-language support (20+ idiomas)
- [ ] Real-time collaboration

---

**Creado con ❤️ por [Sickboooooy](https://github.com/Sickboooooy)**

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
