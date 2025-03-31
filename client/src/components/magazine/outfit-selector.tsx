import React from 'react';
import { Link } from 'wouter';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import GoldBorder from '@/components/ui/gold-border';
import { Outfit } from '@/contexts/outfit-context';

interface OutfitSelectorProps {
  availableOutfits: Outfit[];
  selectedOutfits: Outfit[];
  onOutfitToggle: (outfit: Outfit) => void;
  maxSelections?: number;
  onGenerateClick: () => void;
  isGenerating: boolean;
}

const OutfitSelector: React.FC<OutfitSelectorProps> = ({ 
  availableOutfits, 
  selectedOutfits,
  onOutfitToggle,
  maxSelections = 4,
  onGenerateClick,
  isGenerating
}) => {
  return (
    <GoldBorder className="p-6 gold-glow">
      <h2 className="font-playfair text-xl gold-text mb-4">Selecciona tus Outfits</h2>
      
      {availableOutfits.length === 0 ? (
        <div className="text-center py-8">
          <p className="font-cormorant text-lg text-cream-soft mb-4">
            No tienes outfits guardados o generados
          </p>
          <Link href="/">
            <Button className="gold-button">
              Generar Outfits
            </Button>
          </Link>
        </div>
      ) : (
        <>
          <p className="font-cormorant mb-4 text-cream-soft/80">
            Selecciona hasta {maxSelections} outfits para incluir en tu revista 
            (seleccionados: {selectedOutfits.length}/{maxSelections})
          </p>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
            {availableOutfits.map(outfit => (
              <div 
                key={outfit.id}
                className={`p-3 border rounded-md cursor-pointer transition-all ${
                  selectedOutfits.some(o => o.id === outfit.id) 
                    ? 'border-amber-deep bg-amber-deep/10' 
                    : 'border-amber-deep/20 hover:border-amber-deep/40'
                }`}
                onClick={() => onOutfitToggle(outfit)}
              >
                <div className="flex items-start gap-3">
                  {outfit.imageUrl ? (
                    <div className="w-16 h-16 bg-black-elegant rounded overflow-hidden">
                      <img 
                        src={outfit.imageUrl} 
                        alt={outfit.name} 
                        className="w-full h-full object-cover"
                      />
                    </div>
                  ) : (
                    <div className="w-16 h-16 bg-black-elegant rounded flex items-center justify-center">
                      <span className="text-amber-deep/60 text-xs">Sin imagen</span>
                    </div>
                  )}
                  <div className="flex-1">
                    <h4 className="font-playfair gold-text text-sm">{outfit.name}</h4>
                    <p className="font-cormorant text-xs text-cream-soft/80 line-clamp-2">
                      {outfit.description}
                    </p>
                    <Badge className="mt-1 bg-black text-gold-light border-gold-light text-xs">
                      {outfit.occasion}
                    </Badge>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
      
      <div className="flex justify-end">
        <Button 
          onClick={onGenerateClick}
          disabled={isGenerating || selectedOutfits.length === 0}
          className="gold-button"
        >
          {isGenerating ? 'Generando...' : 'Generar Revista'}
        </Button>
      </div>
    </GoldBorder>
  );
};

export default OutfitSelector;