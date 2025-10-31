import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import GoldText from '@/components/ui/gold-text';
import GoldBorder from '@/components/ui/gold-border';
import SpotlightContainer from '@/components/ui/spotlight-container';
import DesignCard from '@/components/design-card';

interface AnnaDesign {
  id: number;
  name: string;
  category: string;
  imageUrl: string;
}

const AnnaDesignsPage = () => {
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
    <>
      <SpotlightContainer>
        <div className="container mx-auto max-w-5xl">
          <h1 className="font-playfair text-3xl md:text-4xl mb-2 text-center">
            <GoldText>Anna Designs</GoldText> Colección
          </h1>
          <p className="font-cormorant text-center text-lg mb-6 opacity-80 max-w-2xl mx-auto">
            Piezas exclusivas hechas a mano que transforman lo cotidiano en extraordinario
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
                <h2 className="font-playfair text-2xl mb-3 gold-text text-center md:text-left">Sobre Anna</h2>
                <p className="font-cormorant text-lg">
                  Anna es abogada y posee un talento creativo excepcional para elaborar piezas de moda únicas de forma artesanal.
                  Sus diseños exclusivos incluyen calzado, blusas y accesorios personalizados con perlas y aplicaciones elegantes,
                  fusionando su experiencia profesional con una visión artística de la moda.
                </p>
              </div>
            </div>
          </GoldBorder>
          
          {/* Category Tabs */}
          <div className="flex justify-center mb-10">
            <div className="inline-flex border border-amber-deep rounded-full p-1 bg-black">
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
              
              {/* Contact and Custom Order Section */}
              <GoldBorder className="p-8 mt-12 text-center">
                <h3 className="font-playfair text-2xl mb-3 gold-text">Pedidos Personalizados</h3>
                <p className="font-cormorant text-lg mb-6">
                  ¿Quieres una creación a medida? Contacta a Anna para dar vida a tu idea.
                </p>
                <button className="gold-button font-montserrat text-sm font-medium px-8 py-3 rounded-full">
                  SOLICITAR DISEÑO PERSONALIZADO
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
