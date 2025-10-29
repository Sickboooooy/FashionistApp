import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import GoldText from '@/components/ui/gold-text';
import GoldBorder from '@/components/ui/gold-border';
import SpotlightContainer from '@/components/ui/spotlight-container';
import DesignCard from '@/components/design-card';

const AnnaDesignsPage = () => {
  const [selectedCategory, setSelectedCategory] = useState('All');
  
  // Fetch Anna designs from API
  const { 
    data: designs = [],
    isLoading,
    isError 
  } = useQuery({
    queryKey: ['/api/anna-designs'],
  });

  // Filter designs by category
  const filteredDesigns = selectedCategory === 'All'
    ? designs
    : designs.filter((design: any) => design.category === selectedCategory);

  return (
    <>
      <SpotlightContainer>
        <div className="container mx-auto max-w-5xl">
          <h1 className="font-playfair text-3xl md:text-4xl mb-2 text-center">
            <GoldText>Anna Designs</GoldText> Collection
          </h1>
          <p className="font-cormorant text-center text-lg mb-6 opacity-80 max-w-2xl mx-auto">
            Exclusive handcrafted pieces that transform ordinary into extraordinary
          </p>
          
          <GoldBorder className="p-8 mb-12">
            <div className="flex flex-col md:flex-row items-center">
              <div className="md:w-1/3 mb-6 md:mb-0">
                <div className="w-32 h-32 mx-auto rounded-full overflow-hidden gold-border">
                  {/* Placeholder for Anna's profile image */}
                  <div className="w-full h-full bg-gradient-to-br from-amber-deep to-black"></div>
                </div>
              </div>
              <div className="md:w-2/3">
                <h2 className="font-playfair text-2xl mb-3 gold-text text-center md:text-left">About Anna</h2>
                <p className="font-cormorant text-lg">
                  Anna is an attorney with a remarkable creative talent for handcrafting unique fashion pieces. 
                  Her exclusive designs feature personalized footwear, blouses, and accessories adorned with pearls 
                  and elegant appliqués, combining professional expertise with artistic fashion design.
                </p>
              </div>
            </div>
          </GoldBorder>
          
          {/* Category Tabs */}
          <div className="flex justify-center mb-10">
            <div className="inline-flex border border-amber-deep rounded-full p-1 bg-black">
              {['All', 'Footwear', 'Blouses', 'Accessories'].map((category) => (
                <button
                  key={category}
                  className={`px-5 py-2 rounded-full text-sm font-montserrat ${
                    selectedCategory === category
                      ? 'gold-button text-black'
                      : 'text-cream-soft hover:text-amber-deep'
                  }`}
                  onClick={() => setSelectedCategory(category)}
                >
                  {category}
                </button>
              ))}
            </div>
          </div>
          
          {isLoading ? (
            <div className="text-center py-12">
              <p className="font-cormorant text-lg">Loading designs...</p>
            </div>
          ) : isError ? (
            <div className="text-center py-12">
              <p className="font-cormorant text-lg text-red-500">Error loading designs</p>
            </div>
          ) : (
            <>
              {/* Designs Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {filteredDesigns.map((design: any) => (
                  <DesignCard key={design.id} design={design} />
                ))}
              </div>
              
              {/* Contact and Custom Order Section */}
              <GoldBorder className="p-8 mt-12 text-center">
                <h3 className="font-playfair text-2xl mb-3 gold-text">Custom Orders</h3>
                <p className="font-cormorant text-lg mb-6">
                  Interested in a personalized creation? Contact Anna to discuss your vision.
                </p>
                <button className="gold-button font-montserrat text-sm font-medium px-8 py-3 rounded-full">
                  REQUEST CUSTOM DESIGN
                </button>
              </GoldBorder>
            </>
          )}
        </div>
      </SpotlightContainer>
    </>
  );
};

export default AnnaDesignsPage;
