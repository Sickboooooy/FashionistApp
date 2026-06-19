import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import DesignCard from './design-card';
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
    <section className="section-editorial">
      <div className="container mx-auto">
        <div className="text-center mb-10">
          <span className="section-label">Colección exclusiva</span>
          <h2 className="section-title">
            Anna Designs <span className="italic text-amber-500">Colección</span>
          </h2>
          <p className="section-desc">
            Piezas exclusivas hechas a mano que transforman lo cotidiano en extraordinario
          </p>
          
          {/* Category Tabs */}
          <div className="inline-flex gap-1 border border-amber-500/20 rounded-full p-1 bg-white/[0.03] backdrop-blur-sm mb-10">
            {categoryOptions.map((category) => (
              <button
                key={category.value}
                className={`px-5 py-2 rounded-full text-xs font-montserrat uppercase tracking-wider transition-all duration-200 ${
                  selectedCategory === category.value
                    ? 'bg-amber-500/15 text-amber-300 border border-amber-500/40'
                    : 'text-stone-400 hover:text-stone-200 border border-transparent'
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
            <p className="text-stone-400 font-light">Cargando diseños...</p>
          </div>
        ) : isError ? (
          <div className="text-center py-12">
            <p className="text-red-400/90 font-light">Error al cargar los diseños</p>
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
