import { useQuery } from '@tanstack/react-query';
import OutfitCard from './outfit-card';
import GoldText from './ui/gold-text';
import { useOutfit } from '../contexts/outfit-context';

const MOCK_OUTFITS = [
  {
    id: 1,
    name: 'Executive Elegance',
    description: 'A sophisticated ensemble for corporate meetings, featuring a structured blazer with tailored trousers and complementary accessories.',
    occasion: 'FORMAL',
    imageUrl: 'https://images.unsplash.com/photo-1581044777550-4cfa60707c03?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&h=600&q=80',
  },
  {
    id: 2,
    name: 'Weekend Sophistication',
    description: 'A refined yet relaxed look featuring premium denim, a silk blouse, and artisanal accessories perfect for weekend gatherings.',
    occasion: 'CASUAL CHIC',
    imageUrl: 'https://images.unsplash.com/photo-1509631179647-0177331693ae?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&h=600&q=80',
  },
  {
    id: 3,
    name: 'Gala Glamour',
    description: 'A statement ensemble for evening events, featuring a structured silhouette with custom handcrafted Selene details.',
    occasion: 'EVENING',
    imageUrl: 'https://images.unsplash.com/photo-1485968579580-b6d095142e6e?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&h=600&q=80',
  },
];

const OutfitShowcase = () => {
  const { generatedOutfits } = useOutfit();
  
  // In a real application, we would fetch outfits from the API
  // For now, we'll use the context or mock data
  const outfits = generatedOutfits.length > 0 ? generatedOutfits : MOCK_OUTFITS;

  return (
    <section id="outfit-showcase" className="py-12 px-4 md:px-8">
      <div className="container mx-auto">
        <h2 className="font-playfair text-2xl md:text-3xl mb-2 text-center">
          <GoldText>Personalized</GoldText> Style Suggestions
        </h2>
        <p className="font-cormorant text-center text-lg mb-10 opacity-80 max-w-2xl mx-auto">
          AI-crafted outfits based on your preferences, occasion, and style
        </p>
        
        {/* Outfit Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {outfits.map((outfit) => (
            <OutfitCard key={outfit.id} outfit={outfit} />
          ))}
        </div>
      </div>
    </section>
  );
};

export default OutfitShowcase;
