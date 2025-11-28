import { NextResponse } from 'next/server';
import { constructPrompt, type GenerationInput } from '@/lib/ai/prompt-builder';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { product, userScenario, modelPreferences } = body;

    if (!product || !userScenario) {
      return NextResponse.json(
        { error: 'Missing required fields: product or userScenario' },
        { status: 400 }
      );
    }

    const input: GenerationInput = {
      product,
      userScenario,
      modelPreferences: modelPreferences || 'professional model',
    };

    // 1. Construct the "Secret Sauce" Prompt
    const { positive, negative } = constructPrompt(input);

    // 2. (Mock) Call to AI Provider
    // In a real scenario, we would send `positive` and `negative` to Replicate/Flux here.
    console.log('--- GENERATING IMAGE ---');
    console.log('Positive Prompt:', positive);
    console.log('Negative Prompt:', negative);
    console.log('------------------------');

    // Simulate API latency
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // Mock Response
    return NextResponse.json({
      success: true,
      imageUrl: "https://placehold.co/1024x1024/1a1a1a/D4AF37?text=FashionistAPP+AI+Generated",
      promptUsed: positive,
    });

  } catch (error) {
    console.error('Generation error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
