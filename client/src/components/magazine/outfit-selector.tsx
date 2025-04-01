import { FC, useState } from 'react';
import { Outfit } from '@/contexts/outfit-context';
import GoldBorder from '@/components/ui/gold-border';
import GoldText from '@/components/ui/gold-text';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';

interface OutfitCardProps {
  outfit: Outfit;
  isSelected: boolean;
  onToggleSelect: (outfit: Outfit) => void;
  disabled?: boolean;
}

const OutfitCard: FC<OutfitCardProps> = ({ 
  outfit, 
  isSelected, 
  onToggleSelect,
  disabled = false 
}) => {
  return (
    <Card 
      className={`h-full transition-all ${
        isSelected 
          ? 'ring-2 ring-amber-deep shadow-[0_0_15px_rgba(255,215,0,0.3)]' 
          : 'hover:shadow-[0_0_10px_rgba(255,215,0,0.15)]'
      } ${disabled ? 'opacity-50' : ''}`}
    >
      <CardHeader className="p-4 pb-0">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="truncate text-lg">
              <GoldText>{outfit.name}</GoldText>
            </CardTitle>
            <CardDescription className="text-xs">{outfit.occasion}</CardDescription>
          </div>
          <Checkbox 
            checked={isSelected}
            onCheckedChange={() => onToggleSelect(outfit)}
            disabled={disabled && !isSelected}
            className="h-5 w-5 border-amber-deep/70 data-[state=checked]:bg-amber-deep data-[state=checked]:text-black-elegant"
          />
        </div>
      </CardHeader>
      <CardContent className="p-4">
        <GoldBorder className="aspect-square overflow-hidden mb-2">
          <img 
            src={outfit.imageUrl} 
            alt={outfit.name}
            className="w-full h-full object-cover"
          />
        </GoldBorder>
        <p className="text-sm line-clamp-2 h-10 text-muted-foreground">
          {outfit.description}
        </p>
      </CardContent>
    </Card>
  );
};

interface OutfitSelectorProps {
  outfits: Outfit[];
  selectedOutfits: Outfit[];
  onSelectOutfits: (outfits: Outfit[]) => void;
  maxSelections?: number;
}

const OutfitSelector: FC<OutfitSelectorProps> = ({ 
  outfits, 
  selectedOutfits, 
  onSelectOutfits,
  maxSelections = 4 
}) => {
  const [error, setError] = useState<string | null>(null);

  const toggleOutfitSelection = (outfit: Outfit) => {
    const isCurrentlySelected = selectedOutfits.some(o => o.id === outfit.id);
    
    if (isCurrentlySelected) {
      // Deselect outfit
      const newSelectedOutfits = selectedOutfits.filter(o => o.id !== outfit.id);
      onSelectOutfits(newSelectedOutfits);
      setError(null);
    } else {
      // Select outfit
      if (selectedOutfits.length >= maxSelections) {
        setError(`Solo puedes seleccionar hasta ${maxSelections} conjuntos para tu revista.`);
        return;
      }
      
      onSelectOutfits([...selectedOutfits, outfit]);
      setError(null);
    }
  };

  const isMaxSelections = selectedOutfits.length >= maxSelections;

  return (
    <div className="w-full py-6">
      <div className="mb-6 text-center">
        <h2 className="text-3xl font-bold mb-2">
          <GoldText>Selecciona tus Conjuntos</GoldText>
        </h2>
        <p className="text-muted-foreground max-w-2xl mx-auto">
          Elige hasta {maxSelections} conjuntos para incluir en tu revista personalizada. 
          Los conjuntos seleccionados formarán parte de tu revista exclusiva.
        </p>
      </div>

      {error && (
        <Alert variant="destructive" className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-muted-foreground">
          {selectedOutfits.length} de {maxSelections} conjuntos seleccionados
        </p>
        {selectedOutfits.length > 0 && (
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => onSelectOutfits([])}
          >
            Limpiar selección
          </Button>
        )}
      </div>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {outfits.map((outfit) => (
          <OutfitCard
            key={outfit.id}
            outfit={outfit}
            isSelected={selectedOutfits.some(o => o.id === outfit.id)}
            onToggleSelect={toggleOutfitSelection}
            disabled={isMaxSelections}
          />
        ))}
      </div>
    </div>
  );
};

export default OutfitSelector;