/**
 * 🎯 Outfit Recommendation Service - RAG ligero
 *
 * Recomienda productos reales del inventario a partir de:
 *  - un outfit existente (su nombre, descripción, ocasión, temporada)
 *  - y/o las preferencias del usuario (estilos, ocasiones, temporadas)
 *
 * No depende de un LLM: usa recuperación por coincidencia de términos y
 * puntuación por tags/categoría, de modo que funciona offline y sin costo.
 * Si en el futuro se quiere re-ranking con Gemini, este servicio expone el
 * conjunto candidato ya filtrado (el paso "retrieval" del RAG).
 */

import { storage } from "../storage";
import type { Product, Outfit, UserPreferences } from "@shared/schema";
import { log } from "../vite";

export interface RecommendationInput {
  outfit?: Outfit;
  preferences?: UserPreferences;
  /** Texto libre opcional (ej. el prompt del usuario). */
  prompt?: string;
  limit?: number;
}

export interface ScoredProduct extends Product {
  score: number;
  priceFormatted: string;
  matchedOn: string[];
}

/** Extrae términos relevantes (>=3 chars) de un texto. */
function tokenize(text: string | null | undefined): string[] {
  if (!text) return [];
  return text
    .toLowerCase()
    .split(/[\s,.;:!?()'"/]+/)
    .filter((t) => t.length >= 3);
}

/**
 * Construye el "perfil de intención" combinando outfit + preferencias + prompt.
 * Devuelve términos ponderados que luego se usan para puntuar productos.
 */
function buildIntentTerms(input: RecommendationInput): Map<string, number> {
  const weights = new Map<string, number>();
  const add = (terms: string[], weight: number) => {
    for (const term of terms) {
      weights.set(term, (weights.get(term) || 0) + weight);
    }
  };

  if (input.outfit) {
    add(tokenize(input.outfit.name), 2);
    add(tokenize(input.outfit.description), 1);
    add(tokenize(input.outfit.occasion), 3);
    add(tokenize(input.outfit.season), 3);
  }

  if (input.preferences) {
    add((input.preferences.styles || []).flatMap(tokenize), 3);
    add((input.preferences.seasons || []).flatMap(tokenize), 2);
    add(
      (input.preferences.occasions || []).flatMap((o) => tokenize(o.name)),
      2
    );
  }

  add(tokenize(input.prompt), 2);

  return weights;
}

function scoreProduct(product: Product, intent: Map<string, number>): { score: number; matchedOn: string[] } {
  const matchedOn = new Set<string>();
  let score = 0;

  const fields: { value: string; weight: number; label: string }[] = [
    { value: product.category.toLowerCase(), weight: 2, label: product.category },
    { value: (product.name || "").toLowerCase(), weight: 1.5, label: "nombre" },
    { value: (product.description || "").toLowerCase(), weight: 0.5, label: "descripción" },
  ];

  // Tags: la señal más fuerte para matching de estilo/temporada/ocasión.
  for (const tag of product.tags || []) {
    const w = intent.get(tag.toLowerCase());
    if (w) {
      score += w * 2;
      matchedOn.add(tag);
    }
  }

  for (const field of fields) {
    Array.from(intent.entries()).forEach(([term, weight]) => {
      if (field.value.includes(term)) {
        score += weight * field.weight;
        matchedOn.add(field.label);
      }
    });
  }

  return { score, matchedOn: Array.from(matchedOn) };
}

/**
 * Recomienda productos del inventario para un outfit/preferencias dados.
 * Si no hay señal de intención, devuelve los productos en stock como fallback.
 */
export async function recommendProducts(input: RecommendationInput): Promise<ScoredProduct[]> {
  const limit = input.limit ?? 3;

  try {
    const products = await storage.getAllProducts();
    const active = products.filter((p) => p.isActive !== false);
    const intent = buildIntentTerms(input);

    // Sin señal → fallback: productos con más stock.
    if (intent.size === 0) {
      return active
        .sort((a, b) => (b.stock ?? 0) - (a.stock ?? 0))
        .slice(0, limit)
        .map((p) => ({
          ...p,
          score: 0,
          matchedOn: [],
          priceFormatted: `$${(p.price / 100).toFixed(2)}`,
        }));
    }

    const scored = active
      .map((product) => {
        const { score, matchedOn } = scoreProduct(product, intent);
        return {
          ...product,
          score,
          matchedOn,
          priceFormatted: `$${(product.price / 100).toFixed(2)}`,
        };
      })
      .filter((p) => p.score > 0)
      .sort((a, b) => b.score - a.score);

    // Si nada puntuó, devolver fallback en lugar de lista vacía.
    if (scored.length === 0) {
      return active.slice(0, limit).map((p) => ({
        ...p,
        score: 0,
        matchedOn: [],
        priceFormatted: `$${(p.price / 100).toFixed(2)}`,
      }));
    }

    return scored.slice(0, limit);
  } catch (error) {
    log(`Error al recomendar productos: ${error}`, "recommendation-error");
    return [];
  }
}

/** Recomienda a partir del id de un outfit guardado. */
export async function recommendForOutfit(outfitId: number, limit = 3): Promise<ScoredProduct[]> {
  const outfit = await storage.getOutfit(outfitId);
  if (!outfit) return [];

  const preferences = await storage.getUserPreferences(outfit.userId);
  return recommendProducts({ outfit, preferences: preferences ?? undefined, limit });
}
