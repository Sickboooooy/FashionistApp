/**
 * 🌱 Product Seed Script for FashionistApp Smart Inventory
 * 
 * Usage: npx tsx server/seedProducts.ts
 * 
 * This script populates the database with 6 real products from the inventory.
 * Make sure DATABASE_URL is configured in .env before running.
 */

import { db } from "./db";
import { products } from "../shared/schema";
import { eq } from "drizzle-orm";

// 🛒 REAL INVENTORY DATA - 6 Products from CATALOGO FASHION
const inventoryProducts = [
  {
    name: "Jogger Wide Leg Beige",
    description: "Jogger estilo wide leg en tela tipo velvet. Súper cómodo para looks casuales y relajados. Ideal para otoño e invierno.",
    category: "bottom",
    tags: ["comfy", "velvet", "beige", "casual", "wide-leg", "invierno", "otoño"],
    price: 39900, // $399.00 MXN (stored in cents)
    stock: 15,
    imageUrl: "/products/jogger-wide-leg-beige.jpg",
    isActive: true,
  },
  {
    name: "Pantalón Deportivo Gris Acero",
    description: "Pantalón deportivo con cierres decorativos en gris acero. Perfecto para un look urbano y moderno con toques streetwear.",
    category: "bottom",
    tags: ["sport", "cierres", "gris", "urbano", "streetwear", "moderno"],
    price: 34900, // $349.00 MXN
    stock: 20,
    imageUrl: "/products/pantalon-deportivo-gris.jpg",
    isActive: true,
  },
  {
    name: "Suéter Tejido Rayas B&W",
    description: "Suéter tejido clásico con rayas blancas y negras. Un básico atemporal que combina con todo. Perfecto para looks casuales y de oficina.",
    category: "top",
    tags: ["tejido", "rayas", "blanco", "negro", "clásico", "atemporal", "oficina"],
    price: 45900, // $459.00 MXN
    stock: 12,
    imageUrl: "/products/sueter-rayas-bw.jpg",
    isActive: true,
  },
  {
    name: "Suéter Punto Rosa Pastel",
    description: "Suéter de punto texturizado en rosa pastel con manga corta. Suave al tacto, ideal para looks femeninos y románticos.",
    category: "top",
    tags: ["texturizado", "suave", "rosa", "manga-corta", "femenino", "romántico", "primavera"],
    price: 37900, // $379.00 MXN
    stock: 10,
    imageUrl: "/products/sueter-rosa-pastel.jpg",
    isActive: true,
  },
  {
    name: "Cardigan Botones Vintage",
    description: "Cardigan con botones estilo vintage en rosa viejo. Tejido grueso perfecto como abrigo ligero. Dale un toque retro a tu outfit.",
    category: "top",
    tags: ["botones", "rosa-viejo", "tejido-grueso", "abrigo", "vintage", "retro", "invierno"],
    price: 54900, // $549.00 MXN
    stock: 8,
    imageUrl: "/products/cardigan-vintage.jpg",
    isActive: true,
  },
  {
    name: "Leggings Térmicos Translúcidos",
    description: "Leggings térmicos con efecto translúcido tipo piel. Ideales para invierno, mantienen el calor con un look elegante y discreto.",
    category: "bottom",
    tags: ["invierno", "térmico", "negro", "piel", "elegante", "caliente", "leggins"],
    price: 29900, // $299.00 MXN
    stock: 25,
    imageUrl: "/products/leggings-termicos.jpg",
    isActive: true,
  },
];

async function seedProducts() {
  console.log("🌱 Iniciando seed de productos...\n");

  try {
    // Check if products already exist
    const existingProducts = await db.select().from(products);
    
    if (existingProducts.length > 0) {
      console.log(`⚠️  Ya existen ${existingProducts.length} productos en la base de datos.`);
      console.log("   Para reiniciar, elimina los productos existentes primero.\n");
      
      // Ask if we should proceed anyway (add new ones)
      const newProductNames = inventoryProducts.map(p => p.name);
      const existingNames = existingProducts.map(p => p.name);
      const productsToAdd = inventoryProducts.filter(p => !existingNames.includes(p.name));
      
      if (productsToAdd.length > 0) {
        console.log(`📦 Agregando ${productsToAdd.length} productos nuevos...`);
        
        for (const product of productsToAdd) {
          await db.insert(products).values(product);
          console.log(`  ✅ ${product.name} - $${(product.price / 100).toFixed(2)} MXN`);
        }
        
        console.log(`\n🎉 ${productsToAdd.length} productos nuevos insertados.`);
      } else {
        console.log("✅ Todos los productos ya existen. No hay nada que agregar.");
      }
    } else {
      // No existing products, insert all
      console.log("📦 Insertando 6 productos de inventario...\n");
      
      for (const product of inventoryProducts) {
        await db.insert(products).values(product);
        console.log(`  ✅ ${product.name}`);
        console.log(`     Categoría: ${product.category} | Precio: $${(product.price / 100).toFixed(2)} MXN | Stock: ${product.stock}`);
        console.log(`     Tags: ${product.tags.join(", ")}\n`);
      }
      
      console.log("═══════════════════════════════════════════════════════");
      console.log("🎉 ¡6 productos insertados correctamente!");
      console.log("═══════════════════════════════════════════════════════\n");
    }
    
    // Final count
    const finalCount = await db.select().from(products);
    console.log(`📊 Total de productos en la base de datos: ${finalCount.length}`);
    
  } catch (error) {
    console.error("❌ Error al insertar productos:", error);
    throw error;
  }
}

// Run if executed directly
seedProducts()
  .then(() => {
    console.log("\n✅ Seed completado exitosamente.");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n❌ Error en el seed:", error);
    process.exit(1);
  });

export { seedProducts, inventoryProducts };
