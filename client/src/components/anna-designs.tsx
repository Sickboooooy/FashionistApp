import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import DesignCard from './design-card';
import GoldText from './ui/gold-text';
import GoldButton from './ui/gold-button';
import { Link } from 'wouter';

interface AnnaDesign {
  id: number;
  name: string;
  category: string;
  imageUrl: string;
}

const AnnaDesigns = () => {
  const [selectedCategory, setSelectedCategory] = useState('All');
  const categoryOptions = [
    { label: 'Todos', value: 'All' },
    { label: 'Calzado', value: 'Footwear' },
    { label: 'Blusas', value: 'Blouses' },
    { label: 'Accesorios', value: 'Accessories' },
  ];
  
  // Fetch Anna designs from API
  const { 
    data: designs = [],
    isLoading,
    isError 
  } = useQuery<AnnaDesign[]>({
    queryKey: ['/api/anna-designs'],
  });

  // Filter designs by category
  const filteredDesigns = selectedCategory === 'All'
    ? designs
    : designs.filter((design) => design.category === selectedCategory);

  return (
    <section className="py-12 px-4 md:px-8 bg-gradient-to-b from-black to-[#0A0A0A]">
      <div className="container mx-auto">
        <div className="text-center mb-10">
          <h2 className="font-playfair text-2xl md:text-3xl mb-2">
            <GoldText>Anna Designs</GoldText> Colección
          </h2>
          <p className="font-cormorant text-lg mb-8 opacity-80 max-w-2xl mx-auto">
            Piezas exclusivas hechas a mano que transforman lo cotidiano en extraordinario
          </p>
          
          {/* Category Tabs */}
          <div className="inline-flex border border-amber-deep rounded-full p-1 bg-black mb-10">
            {categoryOptions.map((category) => (
              <button
                key={category.value}
                className={`px-5 py-2 rounded-full text-sm font-montserrat ${
                  selectedCategory === category.value
                    ? 'gold-button text-black'
                    : 'text-cream-soft hover:text-amber-deep'
                }`}
                onClick={() => setSelectedCategory(category.value)}
              >
                {category.label}
              </button>
            ))}
          </div>
        </div>
        
        {isLoading ? (
          <div className="text-center py-12">
            <p className="font-cormorant text-lg">Cargando diseños...</p>
          </div>
        ) : isError ? (
          <div className="text-center py-12">
            <p className="font-cormorant text-lg text-red-500">Error al cargar los diseños</p>
          </div>
        ) : (
          <>
            {/* Designs Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {filteredDesigns.map((design) => (
                <DesignCard key={design.id} design={design} />
              ))}
            </div>
            
            <div className="text-center mt-10">
              <Link href="/anna-designs">
                <GoldButton variant="rounded">
                  EXPLORAR COLECCIÓN COMPLETA
                </GoldButton>
              </Link>
            </div>
          </>
        )}
      </div>
    </section>
  );
};

export default AnnaDesigns;
