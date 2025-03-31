import { useOutfit } from '../contexts/outfit-context';
import GoldText from './ui/gold-text';
import ImageUploader from './image-uploader';
import OutfitResults from './outfit-results';
import OutfitCard from './outfit-card';
import { Button } from '@/components/ui/button';
import { Link } from 'wouter';

// Example outfits to show when no outfits have been generated
const SAMPLE_OUTFITS = [
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
  const { generatedOutfits, savedOutfits, isLoading } = useOutfit();
  
  // Determine which outfits to show
  const showSampleOutfits = !isLoading && generatedOutfits.length === 0;
  
  return (
    <section id="outfit-showcase" className="py-12 px-4 md:px-8">
      <div className="container mx-auto">
        {/* Main Outfit Generation Section */}
        <div className="mb-16">
          <h2 className="font-playfair text-2xl md:text-3xl mb-2 text-center">
            <GoldText>Create Your</GoldText> Perfect Outfit
          </h2>
          <p className="font-cormorant text-center text-lg mb-10 opacity-80 max-w-2xl mx-auto">
            Upload a garment image and our AI stylist will craft personalized outfit combinations
          </p>
          
          {/* Image Uploader */}
          <div className="max-w-md mx-auto mb-8">
            <ImageUploader />
          </div>
          
          {/* Generated Outfit Results */}
          <OutfitResults />
        </div>
        
        {/* Sample Outfits or Saved Collections */}
        {showSampleOutfits && (
          <div>
            <h3 className="font-playfair text-xl md:text-2xl mb-2 text-center">
              <GoldText>Curated</GoldText> Style Inspirations
            </h3>
            <p className="font-cormorant text-center text-lg mb-10 opacity-80 max-w-2xl mx-auto">
              Explore these sample looks or create your own personalized outfits above
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {SAMPLE_OUTFITS.map((outfit) => (
                <OutfitCard key={outfit.id} outfit={outfit} />
              ))}
            </div>
          </div>
        )}
        
        {/* Saved Outfits Section (if any) */}
        {savedOutfits.length > 0 && (
          <div className="mt-20">
            <h3 className="font-playfair text-xl md:text-2xl mb-2 text-center">
              <GoldText>Your Saved</GoldText> Collection
            </h3>
            <p className="font-cormorant text-center text-lg mb-6 opacity-80 max-w-2xl mx-auto">
              Outfits you've saved for future reference
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {savedOutfits.slice(0, 3).map((outfit) => (
                <OutfitCard key={outfit.id} outfit={outfit} />
              ))}
            </div>
            
            {savedOutfits.length > 3 && (
              <div className="text-center mt-8">
                <Link href="/my-closet">
                  <Button 
                    variant="outline" 
                    className="border-gold-light text-gold-light hover:bg-amber-deep/10"
                  >
                    View All Saved Outfits
                  </Button>
                </Link>
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
};

export default OutfitShowcase;
