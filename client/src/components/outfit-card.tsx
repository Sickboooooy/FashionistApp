import { useState } from 'react';
import GoldBorder from './ui/gold-border';
import { useToast } from '@/hooks/use-toast';

interface OutfitCardProps {
  outfit: {
    id: number;
    name: string;
    description: string;
    occasion: string;
    imageUrl: string;
  };
}

const OutfitCard = ({ outfit }: OutfitCardProps) => {
  const [isSaved, setIsSaved] = useState(false);
  const { toast } = useToast();

  const handleSaveOutfit = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsSaved(!isSaved);
    
    toast({
      title: isSaved ? 'Conjunto eliminado' : 'Conjunto guardado',
      description: isSaved 
        ? 'Se eliminó de tus conjuntos guardados' 
        : `"${outfit.name}" fue añadido a tus conjuntos guardados`,
    });
  };

  const handleShareOutfit = (e: React.MouseEvent) => {
    e.stopPropagation();
    
    // In a real app, this would open sharing options
    // For now, we'll just show a toast
    toast({
      title: 'Opciones para compartir',
      description: 'Aquí se mostraría la funcionalidad para compartir',
    });
  };

  const handleViewDetails = () => {
    // In a real app, this would navigate to detail view
    // For now, we'll just show a toast
    toast({
      title: 'Ver detalles',
      description: `Aquí se abriría la vista detallada de "${outfit.name}"`,
    });
  };

  return (
    <GoldBorder hover className="group overflow-hidden">
      <div
        className="relative overflow-hidden cursor-pointer"
        onClick={handleViewDetails}
      >
        <img
          src={outfit.imageUrl}
          alt={`Outfit ${outfit.name} para ocasión ${outfit.occasion.toLowerCase()}`}
          className="w-full h-64 object-cover transition-transform duration-500 ease-out group-hover:scale-105"
          loading="lazy"
        />
        {/* Gradient scrim improves legibility of the badge over any image */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
        <div className="absolute bottom-3 right-3 px-3 py-1 rounded-full border border-amber-deep/50 bg-black/50 backdrop-blur-md">
          <span className="font-montserrat text-[10px] tracking-[0.15em] gold-text">{outfit.occasion}</span>
        </div>
      </div>
      <div className="p-6 bg-black">
        <h3 className="font-playfair text-xl mb-2 gold-text">{outfit.name}</h3>
        <p className="font-cormorant mb-4 text-sm md:text-base text-cream-soft/85 line-clamp-3">
          {outfit.description}
        </p>
        <div className="flex justify-between items-center pt-1 border-t border-amber-deep/15">
          <div className="flex gap-3 pt-3">
            <button
              className="text-cream-soft/90 hover:gold-text text-sm flex items-center gap-1.5 transition-colors cursor-pointer"
              onClick={handleSaveOutfit}
              aria-pressed={isSaved}
            >
              <i className={`${isSaved ? 'fas text-amber-deep' : 'far'} fa-bookmark`}></i> Guardar
            </button>
            <button
              className="text-cream-soft/90 hover:gold-text text-sm flex items-center gap-1.5 transition-colors cursor-pointer"
              onClick={handleShareOutfit}
            >
              <i className="far fa-share-square"></i> Compartir
            </button>
          </div>
          <button
            className="text-xs font-montserrat gold-text hover:underline pt-3 cursor-pointer"
            onClick={handleViewDetails}
          >
            VER DETALLES
          </button>
        </div>
      </div>
    </GoldBorder>
  );
};

export default OutfitCard;
