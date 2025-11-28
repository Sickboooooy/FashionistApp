import { constructPrompt, type GenerationInput } from './lib/ai/prompt-builder';

const mockProduct = {
  id: '123',
  name: 'Silk Red Dress',
  description: 'A long elegant silk red dress with V-neck',
  price: 299,
  imageUrl: 'test.jpg',
  category: 'Dresses'
};

const input: GenerationInput = {
  product: mockProduct,
  userScenario: 'A romantic dinner at a rooftop in Mexico City',
  modelPreferences: 'Latina woman, brown hair, confident pose'
};

const result = constructPrompt(input);

console.log('--- TEST RESULT ---');
console.log('Positive:', result.positive);
console.log('Negative:', result.negative);
