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
      title: isSaved ? 'Outfit Removed' : 'Outfit Saved',
      description: isSaved 
        ? 'Removed from your saved outfits' 
        : `"${outfit.name}" added to your saved outfits`,
    });
  };

  const handleShareOutfit = (e: React.MouseEvent) => {
    e.stopPropagation();
    
    // In a real app, this would open sharing options
    // For now, we'll just show a toast
    toast({
      title: 'Share Options',
      description: 'Sharing functionality would open here',
    });
  };

  const handleViewDetails = () => {
    // In a real app, this would navigate to detail view
    // For now, we'll just show a toast
    toast({
      title: 'View Details',
      description: `Detailed view for "${outfit.name}" would open here`,
    });
  };

  return (
    <GoldBorder className="overflow-hidden hover">
      <div className="relative">
        <img 
          src={outfit.imageUrl} 
          alt={outfit.name} 
          className="w-full h-64 object-cover"
        />
        <div className="absolute bottom-0 right-0 px-3 py-1 bg-black gold-border rounded-tl-lg">
          <span className="font-montserrat text-xs tracking-wider">{outfit.occasion}</span>
        </div>
      </div>
      <div className="p-6 bg-black">
        <h3 className="font-playfair text-xl mb-2 gold-text">{outfit.name}</h3>
        <p className="font-cormorant mb-4 text-sm md:text-base">
          {outfit.description}
        </p>
        <div className="flex justify-between items-center">
          <div className="flex space-x-2">
            <button 
              className="text-cream-soft hover:gold-text text-sm flex items-center" 
              onClick={handleSaveOutfit}
            >
              <i className={`${isSaved ? 'fas' : 'far'} fa-bookmark mr-1`}></i> Save
            </button>
            <button 
              className="text-cream-soft hover:gold-text text-sm flex items-center" 
              onClick={handleShareOutfit}
            >
              <i className="far fa-share-square mr-1"></i> Share
            </button>
          </div>
          <button 
            className="text-xs font-montserrat gold-text hover:underline" 
            onClick={handleViewDetails}
          >
            VIEW DETAILS
          </button>
        </div>
      </div>
    </GoldBorder>
  );
};

export default OutfitCard;
