import { createContext, useContext, useState, ReactNode } from 'react';

interface Outfit {
  id: number;
  name: string;
  description: string;
  occasion: string;
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
}

const OutfitContext = createContext<OutfitContextType | undefined>(undefined);

export const OutfitProvider = ({ children }: { children: ReactNode }) => {
  const [isTextModalOpen, setIsTextModalOpen] = useState(false);
  const [generatedOutfits, setGeneratedOutfits] = useState<Outfit[]>([]);
  const [savedOutfits, setSavedOutfits] = useState<Outfit[]>([]);

  const openTextModal = () => setIsTextModalOpen(true);
  const closeTextModal = () => setIsTextModalOpen(false);

  const saveOutfit = (outfit: Outfit) => {
    setSavedOutfits(prev => {
      // Check if outfit is already saved
      if (prev.some(o => o.id === outfit.id)) {
        return prev;
      }
      return [...prev, outfit];
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
