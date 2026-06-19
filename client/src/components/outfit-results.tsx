import { useState, useEffect } from 'react';
import { useOutfit } from '../contexts/outfit-context';
import { cn } from '@/lib/utils';
import GoldBorder from './ui/gold-border';
import type { Outfit } from '../contexts/outfit-context';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Loader2 } from 'lucide-react';
import ProductSuggestions from './product-suggestions';

interface OutfitItemProps {
  outfit: Outfit;
}

const OutfitItem = ({ outfit }: OutfitItemProps) => {
  const { saveOutfit } = useOutfit();

  return (
    <GoldBorder className="overflow-hidden group transition-all duration-300">
      <div className="relative">
        <img 
          src={outfit.imageUrl} 
          alt={outfit.name} 
          className="w-full h-64 object-cover transition-transform duration-500 group-hover:scale-105"
        />
        <Badge variant="outline" className="absolute bottom-2 right-2 bg-stone-950/70 text-amber-400 border-amber-500/30 backdrop-blur-sm uppercase tracking-wider text-[10px]">
          {outfit.occasion}
        </Badge>
      </div>

      <div className="p-5">
        <h3 className="font-serif text-xl text-stone-100 mb-2">{outfit.name}</h3>

        <p className="text-sm line-clamp-2 mb-4 text-stone-300/80 font-light">
          {outfit.description}
        </p>

        <Separator className="bg-amber-500/10 my-3" />

        <div className="flex justify-between items-center">
          <Button 
            variant="ghost" 
            size="sm"
            className="p-0 text-stone-400 hover:text-amber-400 hover:bg-transparent"
            onClick={() => saveOutfit(outfit)}
          >
            <i className="far fa-bookmark mr-1"></i> Guardar
          </Button>

          <Button 
            variant="link" 
            size="sm"
            className="text-[10px] font-montserrat uppercase tracking-wider text-amber-400/80 hover:text-amber-400 p-0"
          >
            Detalles
          </Button>
        </div>
      </div>
    </GoldBorder>
  );
};

const LoadingState = () => (
  <div className="w-full max-w-xl mx-auto text-center py-12">
    <div className="flex flex-col items-center">
      <Loader2 className="h-10 w-10 text-amber-500/70 animate-spin mb-4" />
      <p className="text-stone-400 font-light">Generando conjuntos...</p>
    </div>
  </div>
);

const ErrorState = ({ error }: { error: string }) => (
  <div className="w-full max-w-xl mx-auto text-center py-12 glass-card px-4 border-red-500/20">
    <i className="fas fa-exclamation-triangle text-red-400/80 text-2xl mb-4"></i>
    <p className="text-red-400/90 mb-2 font-light">Error al generar los conjuntos</p>
    <p className="text-stone-500 text-sm font-light">{error}</p>
  </div>
);

const OutfitResults = () => {
  const { generatedOutfits, isLoading, error } = useOutfit();
  const [visibleResults, setVisibleResults] = useState<boolean>(false);
  
  // Efecto para animar la entrada de los resultados
  useEffect(() => {
    if (generatedOutfits.length > 0 && !isLoading) {
      const timer = setTimeout(() => {
        setVisibleResults(true);
      }, 300);
      return () => clearTimeout(timer);
    } else {
      setVisibleResults(false);
    }
  }, [generatedOutfits, isLoading]);

  if (isLoading) {
    return <LoadingState />;
  }

  if (error) {
    return <ErrorState error={error} />;
  }

  if (generatedOutfits.length === 0) {
    return null;
  }

  return (
    <div 
      className={`w-full max-w-7xl mx-auto mt-16 px-4 transition-opacity duration-500 ${
        visibleResults ? 'opacity-100' : 'opacity-0'
      }`}
      id="outfit-results"
    >
      <div className="relative mb-12">
        <div className="absolute left-0 right-0 h-px bg-gradient-to-r from-transparent via-amber-500/20 to-transparent"></div>
        <h2 className="font-serif text-2xl md:text-3xl text-center text-stone-100 py-4 relative">
          <span className="bg-stone-950 px-6">Sugerencias para <span className="italic text-amber-500">ti</span></span>
        </h2>
      </div>

      <div 
        className={cn(
          "grid gap-8",
          generatedOutfits.length === 1 ? "grid-cols-1 max-w-xl mx-auto" :
          generatedOutfits.length === 2 ? "grid-cols-1 md:grid-cols-2" :
          "grid-cols-1 md:grid-cols-2 lg:grid-cols-3"
        )}
      >
        {generatedOutfits.map((outfit, index) => (
          <div 
            key={outfit.id} 
            className={`transition-all duration-500 delay-${index * 100} transform ${
              visibleResults ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'
            }`}
          >
            <OutfitItem outfit={outfit} />
          </div>
        ))}
      </div>

      <ProductSuggestions outfits={generatedOutfits} />
    </div>
  );
};

export default OutfitResults;