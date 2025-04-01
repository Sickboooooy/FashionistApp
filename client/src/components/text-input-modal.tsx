import { useState, useEffect } from 'react';
import GoldButton from './ui/gold-button';
import { useOutfit } from '../contexts/outfit-context';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';

export const TextInputModal = () => {
  const { isTextModalOpen, closeTextModal } = useOutfit();
  const [styleDescription, setStyleDescription] = useState('');
  const [season, setSeason] = useState('Summer');
  const [occasion, setOccasion] = useState('Work');
  const [isGenerating, setIsGenerating] = useState(false);
  const { toast } = useToast();

  // Close modal when clicking outside or pressing Escape
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        closeTextModal();
      }
    };

    if (isTextModalOpen) {
      document.addEventListener('keydown', handleEscape);
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isTextModalOpen, closeTextModal]);

  const handleOutsideClick = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).id === 'textInputModal') {
      closeTextModal();
    }
  };

  const handleGenerateOutfits = async () => {
    if (!styleDescription.trim()) {
      toast({
        title: 'Description Required',
        description: 'Please describe what you are looking for',
        variant: 'destructive',
      });
      return;
    }

    setIsGenerating(true);

    try {
      const response = await apiRequest('POST', '/api/recommendations', {
        textPrompt: styleDescription,
        season,
        occasion,
      });

      if (!response.ok) {
        throw new Error('Failed to generate outfits');
      }

      const data = await response.json();
      
      toast({
        title: 'Outfits Generated',
        description: 'Your personalized outfits are ready to view',
      });

      // Here we would update the outfit context with the generated outfits
      // and navigate to a results page or section

      closeTextModal();
    } catch (error: any) {
      toast({
        title: 'Error al Generar Conjuntos',
        description: error?.message || 'Ocurrió un error inesperado',
        variant: 'destructive',
      });
    } finally {
      setIsGenerating(false);
    }
  };

  if (!isTextModalOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-80 transition-opacity" 
      id="textInputModal"
      onClick={handleOutsideClick}
    >
      <div className="bg-black gold-border rounded-lg max-w-lg w-full p-6 spotlight">
        <div className="flex justify-between items-center mb-6">
          <h3 className="font-playfair text-xl gold-text">Describe tus Necesidades de Estilo</h3>
          <button 
            className="text-cream-soft hover:text-amber-deep"
            onClick={closeTextModal}
            aria-label="Cerrar modal"
          >
            <i className="fas fa-times"></i>
          </button>
        </div>
        
        <div className="mb-6">
          <label className="block font-cormorant text-sm mb-2">¿Qué estás buscando?</label>
          <textarea 
            rows={4} 
            className="w-full bg-black gold-border rounded p-3 text-cream-soft font-cormorant focus:border-amber-deep focus:outline-none"
            placeholder="Ejemplo: 'Un conjunto business casual para una conferencia de verano' o 'Algo elegante para una cena romántica'"
            value={styleDescription}
            onChange={(e) => setStyleDescription(e.target.value)}
          />
        </div>
        
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div>
            <label className="block font-cormorant text-sm mb-2">Temporada</label>
            <select 
              className="w-full bg-black gold-border rounded p-3 text-cream-soft font-cormorant focus:border-amber-deep focus:outline-none"
              value={season}
              onChange={(e) => setSeason(e.target.value)}
            >
              <option>Verano</option>
              <option>Otoño</option>
              <option>Invierno</option>
              <option>Primavera</option>
            </select>
          </div>
          
          <div>
            <label className="block font-cormorant text-sm mb-2">Ocasión</label>
            <select 
              className="w-full bg-black gold-border rounded p-3 text-cream-soft font-cormorant focus:border-amber-deep focus:outline-none"
              value={occasion}
              onChange={(e) => setOccasion(e.target.value)}
            >
              <option>Trabajo</option>
              <option>Casual</option>
              <option>Formal</option>
              <option>Evento Especial</option>
              <option>Viaje</option>
            </select>
          </div>
        </div>
        
        <div className="text-center">
          <GoldButton
            className="w-full"
            onClick={handleGenerateOutfits}
            disabled={isGenerating}
          >
            {isGenerating ? 'GENERANDO...' : 'GENERAR CONJUNTOS'}
          </GoldButton>
        </div>
      </div>
    </div>
  );
};
