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
        <div className="absolute bottom-3 right-3 px-3 py-1 rounded-full border border-amber-500/30 bg-stone-950/70 backdrop-blur-md">
          <span className="font-montserrat text-[10px] tracking-[0.15em] uppercase text-amber-400">{outfit.occasion}</span>
        </div>
      </div>
      <div className="p-6">
        <h3 className="font-serif text-xl mb-2 text-stone-100">{outfit.name}</h3>
        <p className="mb-4 text-sm md:text-base text-stone-300/80 font-light line-clamp-3">
          {outfit.description}
        </p>
        <div className="flex justify-between items-center pt-1 border-t border-amber-500/10">
          <div className="flex gap-3 pt-3">
            <button
              className="text-stone-400 hover:text-amber-400 text-sm flex items-center gap-1.5 transition-colors cursor-pointer"
              onClick={handleSaveOutfit}
              aria-pressed={isSaved}
            >
              <i className={`${isSaved ? 'fas text-amber-400' : 'far'} fa-bookmark`}></i> Guardar
            </button>
            <button
              className="text-stone-400 hover:text-amber-400 text-sm flex items-center gap-1.5 transition-colors cursor-pointer"
              onClick={handleShareOutfit}
            >
              <i className="far fa-share-square"></i> Compartir
            </button>
          </div>
          <button
            className="text-[10px] font-montserrat uppercase tracking-wider text-amber-400/80 hover:text-amber-400 pt-3 cursor-pointer transition-colors"
            onClick={handleViewDetails}
          >
            Ver detalles
          </button>
        </div>
      </div>
    </GoldBorder>
  );
};

export default OutfitCard;
