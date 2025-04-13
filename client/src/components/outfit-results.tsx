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
    <GoldBorder className="overflow-hidden group transition-all duration-300 hover:shadow-[0_0_15px_rgba(255,215,0,0.3)]">
      <div className="relative">
        <img 
          src={outfit.imageUrl} 
          alt={outfit.name} 
          className="w-full h-64 object-cover transition-transform duration-500 group-hover:scale-105"
        />
        <Badge variant="outline" className="absolute bottom-2 right-2 bg-black/60 text-amber-300 border-amber-500">
          {outfit.occasion}
        </Badge>
      </div>

      <div className="p-4 bg-black">
        <h3 className="font-playfair text-xl gold-text mb-2">{outfit.name}</h3>

        <p className="font-cormorant text-sm line-clamp-2 mb-4 text-cream-soft/80">
          {outfit.description}
        </p>

        <Separator className="bg-amber-deep/20 my-3" />

        <div className="flex justify-between items-center">
          <Button 
            variant="ghost" 
            size="sm"
            className="p-0 text-cream-soft hover:text-amber-deep hover:bg-transparent"
            onClick={() => saveOutfit(outfit)}
          >
            <i className="far fa-bookmark mr-1"></i> Guardar
          </Button>

          <Button 
            variant="link" 
            size="sm"
            className="text-xs font-montserrat text-amber-deep hover:text-amber-deep/80 p-0"
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
      <Loader2 className="h-12 w-12 text-amber-deep animate-spin mb-4" />
      <p className="text-amber-300/70">Generando conjuntos...</p>
    </div>
  </div>
);

const ErrorState = ({ error }: { error: string }) => (
  <div className="w-full max-w-xl mx-auto text-center py-12 bg-black-elegant rounded-lg border border-red-800/30 px-4">
    <i className="fas fa-exclamation-triangle text-red-500 text-2xl mb-4"></i>
    <p className="text-red-400 mb-2">Error al generar los conjuntos</p>
    <p className="text-red-400/70 text-sm">{error}</p>
  </div>
);

const OutfitResults = () => {
  const { generatedOutfits, isLoading, error } = useOutfit();

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
    <div className="w-full max-w-7xl mx-auto mt-12 px-4">
      <h2 className="font-playfair text-2xl text-center gold-text mb-8">
        Sugerencias
      </h2>

      <div 
        className={cn(
          "grid gap-8",
          generatedOutfits.length === 1 ? "grid-cols-1 max-w-xl mx-auto" :
          generatedOutfits.length === 2 ? "grid-cols-1 md:grid-cols-2" :
          "grid-cols-1 md:grid-cols-2 lg:grid-cols-3"
        )}
      >
        {generatedOutfits.map((outfit) => (
          <OutfitItem key={outfit.id} outfit={outfit} />
        ))}
      </div>

      <ProductSuggestions outfits={generatedOutfits} />
    </div>
  );
};

export default OutfitResults;