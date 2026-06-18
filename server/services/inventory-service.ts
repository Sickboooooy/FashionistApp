/**
 * 🛒 Inventory Service - Smart Inventory System
 *
 * Consultas y filtrado del inventario real de productos.
 * Trabaja sobre la capa de `storage` (MemStorage en demo, DB en producción),
 * de modo que funciona aún sin DATABASE_URL configurada.
 */

import { storage, type ProductSearchFilters } from "../storage";
import type { Product } from "@shared/schema";
import { log } from "../vite";

/** Producto enriquecido para el frontend (precio formateado en MXN). */
export interface ProductView extends Product {
  priceFormatted: string; // "$399.00"
  priceMXN: number; // 399
  inStock: boolean;
}

/** Convierte el precio en centavos a una vista amigable. */
function toProductView(product: Product): ProductView {
  const priceMXN = product.price / 100;
  return {
    ...product,
    priceMXN,
    priceFormatted: `$${priceMXN.toFixed(2)}`,
    inStock: (product.stock ?? 0) > 0,
  };
}

/**
 * Convierte filtros que llegan en pesos (frontend) a centavos (storage).
 * El frontend maneja rangos de precio en unidades enteras; internamente
 * los productos se guardan en centavos.
 */
export interface ProductQuery {
  query?: string;
  category?: string;
  minPrice?: number; // en pesos MXN
  maxPrice?: number; // en pesos MXN
  tags?: string[];
}

export async function listProducts(query: ProductQuery = {}): Promise<ProductView[]> {
  const filters: ProductSearchFilters = {
    query: query.query,
    category: query.category,
    tags: query.tags,
    activeOnly: true,
    minPrice: typeof query.minPrice === "number" ? Math.round(query.minPrice * 100) : undefined,
    maxPrice: typeof query.maxPrice === "number" ? Math.round(query.maxPrice * 100) : undefined,
  };

  try {
    const products = await storage.searchProducts(filters);
    return products.map(toProductView);
  } catch (error) {
    log(`Error al consultar inventario: ${error}`, "inventory-error");
    return [];
  }
}

export async function getProductById(id: number): Promise<ProductView | undefined> {
  const product = await storage.getProduct(id);
  return product ? toProductView(product) : undefined;
}

export async function getProductsByCategory(category: string): Promise<ProductView[]> {
  const products = await storage.getProductsByCategory(category);
  return products.map(toProductView);
}
