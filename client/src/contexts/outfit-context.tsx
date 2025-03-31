import { createContext, useContext, useState, ReactNode } from 'react';
import { useToast } from "@/hooks/use-toast";

export interface Outfit {
  id: number;
  name: string;
  description: string;
  occasion: string;
  season?: string;
  pieces?: string[];
  reasoning?: string;
  imageUrl: string;
}

interface OutfitContextType {
  isTextModalOpen: boolean;
  openTextModal: () => void;
  closeTextModal: () => void;
  generatedOutfits: Outfit[];
  setGeneratedOutfits: (outfits: Outfit[]) => void;
  savedOutfits: Outfit[];
  saveOutfit: (outfit: Outfit) => void;
  removeOutfit: (outfitId: number) => void;
  isLoading: boolean;
  uploadImage: (file: File) => Promise<void>;
  error: string | null;
}

const OutfitContext = createContext<OutfitContextType | undefined>(undefined);

export const OutfitProvider = ({ children }: { children: ReactNode }) => {
  const [isTextModalOpen, setIsTextModalOpen] = useState(false);
  const [generatedOutfits, setGeneratedOutfits] = useState<Outfit[]>([]);
  const [savedOutfits, setSavedOutfits] = useState<Outfit[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const openTextModal = () => setIsTextModalOpen(true);
  const closeTextModal = () => setIsTextModalOpen(false);

  const uploadImage = async (file: File) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const formData = new FormData();
      formData.append('image', file);
      
      // Add user preferences if available
      // This would typically come from the preferences context
      // const userPreferences = { /* preferences data */ };
      // formData.append('preferences', JSON.stringify(userPreferences));
      
      const response = await fetch('/api/generate-outfits', {
        method: 'POST',
        body: formData,
      });
      
      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || 'Error generating outfits');
      }
      
      setGeneratedOutfits(data.outfits);
      
      toast({
        title: "Success!",
        description: `Generated ${data.outfits.length} outfit suggestions`,
      });
    } catch (err: any) {
      const errorMessage = err.message || 'Unexpected error occurred';
      setError(errorMessage);
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const saveOutfit = (outfit: Outfit) => {
    setSavedOutfits(prev => {
      // Check if outfit is already saved
      if (prev.some(o => o.id === outfit.id)) {
        return prev;
      }
      return [...prev, outfit];
    });
    
    toast({
      title: "Outfit Saved",
      description: `"${outfit.name}" saved to your collection`,
    });
  };

  const removeOutfit = (outfitId: number) => {
    setSavedOutfits(prev => prev.filter(outfit => outfit.id !== outfitId));
  };

  return (
    <OutfitContext.Provider
      value={{
        isTextModalOpen,
        openTextModal,
        closeTextModal,
        generatedOutfits,
        setGeneratedOutfits,
        savedOutfits,
        saveOutfit,
        removeOutfit,
        isLoading,
        uploadImage,
        error
      }}
    >
      {children}
    </OutfitContext.Provider>
  );
};

export const useOutfit = () => {
  const context = useContext(OutfitContext);
  if (context === undefined) {
    throw new Error('useOutfit must be used within an OutfitProvider');
  }
  return context;
};
