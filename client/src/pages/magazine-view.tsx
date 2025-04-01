import { FC, useState, useEffect } from 'react';
import { useOutfit } from '@/contexts/outfit-context';
import { usePreferences } from '@/contexts/preferences-context';
import GoldText from '@/components/ui/gold-text';
import { Link } from 'wouter';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { Outfit } from '@/contexts/outfit-context';
import TemplateSelector, { MagazineTemplate } from '@/components/magazine/template-selector';
import OutfitSelector from '@/components/magazine/outfit-selector';
import MagazinePreview, { MagazineContent } from '@/components/magazine/magazine-preview';
import PdfExporter from '@/components/magazine/pdf-exporter';
import { Step, StepDescription, StepIndicator, StepLabel, Stepper } from '@/components/ui/stepper';
import { ArrowLeft, ArrowRight } from 'lucide-react';

// Mock function for premium check - would be replaced with actual auth logic
const isPremiumUser = () => false;

const MagazineView: FC = () => {
  const { savedOutfits, generatedOutfits } = useOutfit();
  const { preferences } = usePreferences();
  const { toast } = useToast();
  
  const [step, setStep] = useState<number>(0);
  const [selectedTemplate, setSelectedTemplate] = useState<MagazineTemplate>('vogue');
  const [selectedOutfits, setSelectedOutfits] = useState<Outfit[]>([]);
  const [magazineContent, setMagazineContent] = useState<MagazineContent | null>(null);
  
  // All available outfits for selection
  const availableOutfits = [...savedOutfits, ...generatedOutfits.filter(o => 
    !savedOutfits.some(saved => saved.id === o.id)
  )];
  
  const isPremium = isPremiumUser();
  
  const handleNextStep = () => {
    if (step === 0 && !selectedTemplate) {
      toast({
        title: "Selección requerida",
        description: "Por favor, selecciona una plantilla antes de continuar",
        variant: "destructive",
      });
      return;
    }
    
    if (step === 1 && selectedOutfits.length === 0) {
      toast({
        title: "Selección requerida",
        description: "Por favor, selecciona al menos un conjunto antes de continuar",
        variant: "destructive",
      });
      return;
    }
    
    setStep(prevStep => Math.min(prevStep + 1, 3));
  };
  
  const handlePreviousStep = () => {
    setStep(prevStep => Math.max(prevStep - 1, 0));
  };
  
  const handleTemplateSelect = (template: MagazineTemplate) => {
    setSelectedTemplate(template);
    setMagazineContent(null); // Reset magazine content when template changes
  };
  
  const handleOutfitsSelect = (outfits: Outfit[]) => {
    setSelectedOutfits(outfits);
    setMagazineContent(null); // Reset magazine content when outfits change
  };
  
  const handleContentGenerated = (content: MagazineContent) => {
    setMagazineContent(content);
  };

  return (
    <div className="min-h-screen py-10 px-4">
      <div className="container mx-auto max-w-6xl">
        <h1 className="text-3xl md:text-4xl text-center mb-2">
          <GoldText>Visualización</GoldText> Magazine Style
        </h1>
        <p className="text-center text-lg opacity-80 max-w-2xl mx-auto mb-10">
          Transforma tus conjuntos en una elegante revista de moda personalizada
        </p>
        
        {/* Stepper */}
        <Stepper className="max-w-3xl mx-auto mb-8" index={step}>
          <Step>
            <StepIndicator>1</StepIndicator>
            <div className="flex flex-col">
              <StepLabel>Plantilla</StepLabel>
              <StepDescription>Elige un diseño</StepDescription>
            </div>
          </Step>
          <Step>
            <StepIndicator>2</StepIndicator>
            <div className="flex flex-col">
              <StepLabel>Conjuntos</StepLabel>
              <StepDescription>Selecciona conjuntos</StepDescription>
            </div>
          </Step>
          <Step>
            <StepIndicator>3</StepIndicator>
            <div className="flex flex-col">
              <StepLabel>Previsualización</StepLabel>
              <StepDescription>Revisa el contenido</StepDescription>
            </div>
          </Step>
          <Step>
            <StepIndicator>4</StepIndicator>
            <div className="flex flex-col">
              <StepLabel>Exportar</StepLabel>
              <StepDescription>Guarda tu revista</StepDescription>
            </div>
          </Step>
        </Stepper>
        
        <Separator className="mb-8" />
        
        {/* Step Content */}
        <div className="mt-8">
          {step === 0 && (
            <TemplateSelector 
              onSelectTemplate={handleTemplateSelect}
              isPremiumUser={isPremium}
              selectedTemplate={selectedTemplate}
            />
          )}
          
          {step === 1 && (
            <OutfitSelector 
              outfits={availableOutfits}
              selectedOutfits={selectedOutfits}
              onSelectOutfits={handleOutfitsSelect}
              maxSelections={4}
            />
          )}
          
          {step === 2 && (
            <MagazinePreview 
              selectedTemplate={selectedTemplate}
              selectedOutfits={selectedOutfits}
              userPreferences={preferences}
              isPremiumUser={isPremium}
              onContentGenerated={handleContentGenerated}
            />
          )}
          
          {step === 3 && (
            <div className="flex flex-col items-center">
              <div className="mb-8 text-center">
                <h2 className="text-3xl font-bold mb-2">
                  <GoldText>Exporta tu Revista</GoldText>
                </h2>
                <p className="text-muted-foreground max-w-2xl mx-auto">
                  Descarga tu revista como PDF para compartirla o imprimirla.
                </p>
              </div>
              
              <PdfExporter 
                magazineContent={magazineContent}
                isPremiumUser={isPremium}
              />
            </div>
          )}
        </div>
        
        {/* Navigation Buttons */}
        <div className="flex justify-between mt-12">
          <Button 
            variant="outline" 
            onClick={handlePreviousStep}
            disabled={step === 0}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Atrás
          </Button>
          
          {step < 3 ? (
            <Button 
              onClick={handleNextStep}
              className="gold-button flex items-center gap-2"
              disabled={(step === 2 && !magazineContent)}
            >
              {step === 2 && !magazineContent ? 'Genera contenido primero' : 'Siguiente'}
              <ArrowRight className="h-4 w-4" />
            </Button>
          ) : (
            <Link href="/">
              <Button variant="outline">
                Finalizar
              </Button>
            </Link>
          )}
        </div>
      </div>
    </div>
  );
};

export default MagazineView;