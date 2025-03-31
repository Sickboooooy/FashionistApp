import { useState, useEffect } from 'react';
import { useOutfit } from '../contexts/outfit-context';
import { usePreferences } from '../contexts/preferences-context';
import GoldText from '@/components/ui/gold-text';
import { Link } from 'wouter';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { Outfit } from '../contexts/outfit-context';
import TemplateSelector, { MagazineTemplate } from '@/components/magazine/template-selector';
import OutfitSelector from '@/components/magazine/outfit-selector';
import MagazinePreview, { MagazineContentType } from '@/components/magazine/magazine-preview';

// Template options
const MAGAZINE_TEMPLATES = [
  { id: 'vogue', name: 'Vogue', type: 'free', image: 'vogue-template.jpg' },
  { id: 'elle', name: 'Elle', type: 'free', image: 'elle-template.jpg' },
  { id: 'bazaar', name: 'Harper\'s Bazaar', type: 'premium', image: 'bazaar-template.jpg' },
  { id: 'vanity', name: 'Vanity Fair', type: 'premium', image: 'vanity-template.jpg' },
  { id: 'selene', name: 'Selene Signature', type: 'premium', image: 'selene-template.jpg' },
];

// Mock function for premium check - would be replaced with actual auth logic
const isPremiumUser = () => false;

const MagazineView = () => {
  const { savedOutfits, generatedOutfits } = useOutfit();
  const { preferences } = usePreferences();
  const { toast } = useToast();
  
  const [selectedTemplate, setSelectedTemplate] = useState('vogue');
  const [selectedOutfits, setSelectedOutfits] = useState<Outfit[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [magazineContent, setMagazineContent] = useState<MagazineContentType | null>(null);
  const [previewMode, setPreviewMode] = useState<'select' | 'preview'>('select');
  
  // All available outfits for selection
  const availableOutfits = [...savedOutfits, ...generatedOutfits.filter(o => 
    !savedOutfits.some(saved => saved.id === o.id)
  )];
  
  const isPremium = isPremiumUser();
  const selectedTemplateInfo = MAGAZINE_TEMPLATES.find(t => t.id === selectedTemplate);
  
  // Check if selected template is premium but user is not
  const isPremiumTemplate = selectedTemplateInfo?.type === 'premium';
  const showWatermark = isPremiumTemplate && !isPremium;
  
  // Handle outfit selection
  const toggleOutfitSelection = (outfit: Outfit) => {
    if (selectedOutfits.some(o => o.id === outfit.id)) {
      setSelectedOutfits(prev => prev.filter(o => o.id !== outfit.id));
    } else {
      // Limit to max 4 outfits
      if (selectedOutfits.length < 4) {
        setSelectedOutfits(prev => [...prev, outfit]);
      } else {
        toast({
          title: "Límite alcanzado",
          description: "Puedes seleccionar un máximo de 4 outfits para tu revista",
          variant: "destructive",
        });
      }
    }
  };
  
  // Generate magazine content
  const generateMagazine = async () => {
    if (selectedOutfits.length === 0) {
      toast({
        title: "Sin outfits seleccionados",
        description: "Por favor, selecciona al menos un outfit para generar tu revista",
        variant: "destructive",
      });
      return;
    }
    
    setIsGenerating(true);
    
    try {
      // Here we would call our API to generate magazine content with OpenAI
      // For now, we'll simulate it with a timeout
      setTimeout(() => {
        const mockMagazineContent = {
          title: "TU ESTILO PERSONALIZADO",
          subtitle: "EDICIÓN EXCLUSIVA SELENE",
          introduction: "Descubre cómo combinar estas piezas seleccionadas especialmente para ti. Un viaje por el estilo que define tu personalidad única.",
          outfits: selectedOutfits.map(outfit => ({
            ...outfit,
            editorial: `Este ${outfit.name} representa la fusión perfecta entre sofisticación y tendencia. Ideal para ${outfit.occasion}, las texturas y tonalidades se complementan creando una armonía visual distintiva.`
          })),
          conclusion: "Estas combinaciones elegantes reflejan tu esencia única. Selene Style ha creado este contenido exclusivamente para ti, basándose en tus preferencias y en las últimas tendencias de la moda internacional.",
          template: selectedTemplate,
          date: new Date().toLocaleDateString('es-ES', { 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
          })
        };
        
        setMagazineContent(mockMagazineContent);
        setPreviewMode('preview');
        setIsGenerating(false);
      }, 2000);
      
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo generar la revista. Inténtalo de nuevo.",
        variant: "destructive",
      });
      setIsGenerating(false);
    }
  };
  
  // Export to PDF
  const exportToPDF = () => {
    // This would be replaced with actual PDF export logic
    toast({
      title: "Exportando PDF",
      description: "Tu revista se está generando y descargará automáticamente",
    });
  };
  
  // Share magazine
  const shareMagazine = () => {
    // This would be replaced with actual sharing logic
    toast({
      title: "Compartir",
      description: "Función disponible próximamente",
    });
  };
  
  return (
    <div className="min-h-screen py-10 px-4">
      <div className="container mx-auto max-w-6xl">
        <h1 className="font-playfair text-3xl md:text-4xl text-center mb-2">
          <GoldText>Visualización</GoldText> Magazine Style
        </h1>
        <p className="font-cormorant text-center text-lg opacity-80 max-w-2xl mx-auto mb-10">
          Transforma tus outfits en una elegante revista de moda personalizada
        </p>
        
        {previewMode === 'select' ? (
          <div>
            <div className="grid grid-cols-1 md:grid-cols-5 gap-8 mb-10">
              <div className="md:col-span-2">
                <TemplateSelector 
                  templates={MAGAZINE_TEMPLATES as MagazineTemplate[]}
                  selectedTemplate={selectedTemplate}
                  onTemplateChange={setSelectedTemplate}
                  isPremiumUser={isPremium}
                />
              </div>
              
              <div className="md:col-span-3">
                <OutfitSelector 
                  availableOutfits={availableOutfits}
                  selectedOutfits={selectedOutfits}
                  onOutfitToggle={toggleOutfitSelection}
                  onGenerateClick={generateMagazine}
                  isGenerating={isGenerating}
                />
              </div>
            </div>
          </div>
        ) : (
          // Magazine Preview Mode
          <MagazinePreview 
            content={magazineContent}
            templateName={selectedTemplateInfo?.name || ''}
            showWatermark={showWatermark}
            onBackClick={() => setPreviewMode('select')}
            isGenerating={isGenerating}
          />
        )}
      </div>
    </div>
  );
};

export default MagazineView;