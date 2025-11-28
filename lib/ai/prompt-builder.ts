import { type Product } from '@/types';

// This defines the photographic quality. DO NOT CHANGE between generations.
const STYLE_PREFIX = "A high-fashion editorial magazine cover photograph. Shot on medium format Hasselblad X2D, 100MP. Cinematic color grading, rich textures, extremely sharp focus on garment. Shallow depth of field, beautiful bokeh background. Confident, powerful pose. 8k resolution, highly detailed.";

// This prevents low-quality results.
const NEGATIVE_PROMPT = "cartoon, anime, 3d render, video game, drawing, painting, low quality, amateur, blurry, grainy, deformed hands, ugly face, bad anatomy, plastic skin, mannequin look, studio backdrop, flat lighting.";

export interface GenerationInput {
  product: Product;
  userScenario: string;
  modelPreferences: string;
}

export interface PromptResult {
  positive: string;
  negative: string;
}

/**
 * Constructs the final prompt using the "Master Formula":
 * [STYLE_PREFIX] + [SUBJECT & ACTION] + [PRODUCT DETAILS] + [SCENARIO & LIGHTING] + [NEGATIVE PROMPT]
 */
export function constructPrompt(input: GenerationInput): PromptResult {
  const { product, userScenario, modelPreferences } = input;

  // Extract garment details to ensure consistency
  const garmentDetails = `wearing the ${product.name}, described as: ${product.description}. The fabric texture is palpable.`;

  // Combine user's scenario with dramatic lighting keywords
  const scenarioWithDrama = `${userScenario}, during golden hour sunset, dramatic rim lighting, warm cinematic tones.`;

  // Assemble the final prompt
  const positivePrompt = `${STYLE_PREFIX} A fashion model (${modelPreferences}) ${garmentDetails} stood in ${scenarioWithDrama}`;

  return {
    positive: positivePrompt,
    negative: NEGATIVE_PROMPT
  };
}
