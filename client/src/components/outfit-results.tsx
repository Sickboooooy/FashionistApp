import { useOutfit } from '../contexts/outfit-context';
import { cn } from '@/lib/utils';
import GoldBorder from './ui/gold-border';
import type { Outfit } from '../contexts/outfit-context';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';

const OutfitItem = ({ outfit }: { outfit: Outfit }) => {
  const { saveOutfit } = useOutfit();
  
  return (
    <GoldBorder 
      className="overflow-hidden transition-all hover:shadow-2xl"
      hover
    >
      <div className="p-6">
        <h3 className="font-playfair text-xl font-semibold gold-text mb-2">
          {outfit.name}
        </h3>
        
        <div className="flex flex-wrap gap-2 mb-4">
          <Badge className="bg-gold-light text-black font-medium">{outfit.occasion}</Badge>
          {outfit.season && (
            <Badge variant="outline" className="border-gold-light text-gold-light font-medium">
              {outfit.season}
            </Badge>
          )}
        </div>
        
        <p className="font-cormorant text-cream-soft mb-6">
          {outfit.description}
        </p>
        
        {outfit.pieces && outfit.pieces.length > 0 && (
          <>
            <Separator className="my-4 bg-amber-deep/30" />
            <div className="mt-4">
              <h4 className="text-sm uppercase tracking-wider text-amber-deep mb-2">Pieces</h4>
              <ul className="list-disc pl-5 font-cormorant text-cream-soft space-y-1">
                {outfit.pieces.map((piece, idx) => (
                  <li key={idx}>{piece}</li>
                ))}
              </ul>
            </div>
          </>
        )}
        
        {outfit.reasoning && (
          <div className="mt-4 border-t border-amber-deep/30 pt-4">
            <h4 className="text-sm uppercase tracking-wider text-amber-deep mb-2">Style Notes</h4>
            <p className="font-cormorant italic text-cream-soft/90">
              {outfit.reasoning}
            </p>
          </div>
        )}
        
        <div className="mt-6 flex justify-end">
          <Button 
            onClick={() => saveOutfit(outfit)}
            variant="outline"
            className="border-gold-light text-gold-light hover:bg-amber-deep/10"
          >
            Save to My Collection
          </Button>
        </div>
      </div>
    </GoldBorder>
  );
};

const LoadingState = () => (
  <div className="w-full max-w-3xl mx-auto mt-12 px-4">
    <h2 className="font-playfair text-2xl text-center gold-text mb-8">
      Generating Your Outfits
    </h2>
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {[1, 2, 3].map((i) => (
        <div key={i} className="bg-black border border-amber-deep/20 rounded-lg p-6 animate-pulse">
          <div className="h-6 bg-amber-deep/10 rounded mb-4 w-3/4"></div>
          <div className="flex gap-2 mb-4">
            <div className="h-6 bg-amber-deep/10 rounded w-20"></div>
            <div className="h-6 bg-amber-deep/10 rounded w-16"></div>
          </div>
          <div className="space-y-2">
            <div className="h-4 bg-amber-deep/10 rounded w-full"></div>
            <div className="h-4 bg-amber-deep/10 rounded w-full"></div>
            <div className="h-4 bg-amber-deep/10 rounded w-5/6"></div>
            <div className="h-4 bg-amber-deep/10 rounded w-4/6"></div>
          </div>
          <div className="h-10 bg-amber-deep/10 rounded mt-6 w-1/2 ml-auto"></div>
        </div>
      ))}
    </div>
  </div>
);

const ErrorState = ({ error }: { error: string }) => (
  <div className="w-full max-w-xl mx-auto mt-12 px-4">
    <GoldBorder className="p-6 bg-black-elegant">
      <h2 className="font-playfair text-xl gold-text mb-4">Error Generating Outfits</h2>
      <p className="font-cormorant text-cream-soft mb-6">
        {error || "There was an error processing your request. Please try again."}
      </p>
      <p className="font-cormorant text-cream-soft/80 italic text-sm mb-4">
        Possible solutions:
      </p>
      <ul className="list-disc pl-5 font-cormorant text-cream-soft/80 space-y-1 text-sm">
        <li>Try uploading a different image</li>
        <li>Ensure the image clearly shows a garment</li>
        <li>Check your internet connection</li>
      </ul>
    </GoldBorder>
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
      <h2 className="font-playfair text-3xl text-center gold-text mb-2">
        Your Curated Looks
      </h2>
      <p className="font-cormorant text-center text-cream-soft/80 mb-10 max-w-2xl mx-auto">
        Selene's AI stylist has created these outfit suggestions based on your garment.
        Each look is elegantly crafted to match your style preferences.
      </p>
      
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
    </div>
  );
};

export default OutfitResults;