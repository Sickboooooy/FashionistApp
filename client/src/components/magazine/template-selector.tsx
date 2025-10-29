import { FC, useState } from 'react';
import GoldBorder from '@/components/ui/gold-border';
import GoldText from '@/components/ui/gold-text';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';

// Define las plantillas disponibles
export type MagazineTemplate = 'vogue' | 'elle' | 'bazaar' | 'vanity' | 'anna';

interface Template {
  id: MagazineTemplate;
  name: string;
  description: string;
  isPremium: boolean;
  imagePath: string;
}

const templates: Template[] = [
  {
    id: 'vogue',
    name: 'Vogue',
    description: 'Diseño clásico con enfoque en una imagen principal y espacio editorial minimalista.',
    isPremium: false,
    imagePath: '/images/magazines/vogue-template.svg',
  },
  {
    id: 'elle',
    name: 'Elle',
    description: 'Diseño moderno con división de página para mostrar múltiples conjuntos.',
    isPremium: false,
    imagePath: '/images/magazines/elle-template.svg',
  },
  {
    id: 'bazaar',
    name: "Harper's Bazaar",
    description: 'Elegante diseño con presentación de imágenes en galería y espacio para detalles.',
    isPremium: true,
    imagePath: '/images/magazines/bazaar-template.svg',
  },
  {
    id: 'vanity',
    name: 'Vanity Fair',
    description: 'Diseño sofisticado con enfoque en contenido editorial extenso.',
    isPremium: true,
    imagePath: '/images/magazines/vanity-template.svg',
  },
  {
    id: 'anna',
    name: 'Anna Signature',
    description: 'Exclusivo diseño premium con detalles dorados y presentación de lujo.',
    isPremium: true,
    imagePath: '/images/magazines/anna-template.svg',
  },
];

interface TemplateCardProps {
  template: Template;
  isPremiumUser: boolean;
  isSelected: boolean;
  onSelect: (id: MagazineTemplate) => void;
}

const TemplateCard: FC<TemplateCardProps> = ({ template, isPremiumUser, isSelected, onSelect }) => {
  const isDisabled = template.isPremium && !isPremiumUser;
  
  return (
    <Card 
      className={`h-full transition-all ${
        isSelected 
          ? 'ring-2 ring-amber-deep shadow-[0_0_15px_rgba(255,215,0,0.3)]' 
          : 'hover:shadow-[0_0_10px_rgba(255,215,0,0.15)]'
      } ${isDisabled ? 'opacity-70' : ''}`}
    >
      <CardHeader className="p-4">
        <CardTitle className="flex items-center justify-between">
          <GoldText>{template.name}</GoldText>
          {template.isPremium && (
            <span className="text-xs text-amber-deep font-semibold">PREMIUM</span>
          )}
        </CardTitle>
        <CardDescription className="text-sm">{template.description}</CardDescription>
      </CardHeader>
      <CardContent className="p-4 pt-0">
        <GoldBorder className="aspect-[3/4] relative overflow-hidden">
          <img 
            src={template.imagePath} 
            alt={`${template.name} template preview`}
            className="w-full h-full object-cover"
          />
          {isDisabled && (
            <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
              <span className="text-amber-deep font-semibold">Solo Premium</span>
            </div>
          )}
        </GoldBorder>
      </CardContent>
      <CardFooter className="p-4 pt-0">
        <Button 
          onClick={() => !isDisabled && onSelect(template.id)}
          disabled={isDisabled}
          variant={isSelected ? "default" : "outline"}
          className={isSelected ? "gold-button w-full" : "w-full"}
        >
          {isSelected ? 'Seleccionado' : isDisabled ? 'Requiere Premium' : 'Seleccionar'}
        </Button>
      </CardFooter>
    </Card>
  );
};

interface TemplateSelectorProps {
  onSelectTemplate: (template: MagazineTemplate) => void;
  isPremiumUser?: boolean;
  selectedTemplate?: MagazineTemplate;
}

const TemplateSelector: FC<TemplateSelectorProps> = ({ 
  onSelectTemplate, 
  isPremiumUser = false,
  selectedTemplate
}) => {
  const handleSelectTemplate = (id: MagazineTemplate) => {
    onSelectTemplate(id);
  };

  return (
    <div className="w-full py-6">
      <div className="mb-8 text-center">
        <h2 className="text-3xl font-bold mb-2">
          <GoldText>Selecciona tu Plantilla</GoldText>
        </h2>
        <p className="text-muted-foreground max-w-2xl mx-auto">
          Elige el estilo que mejor refleje tu personalidad. Las plantillas premium 
          están disponibles exclusivamente para usuarios con suscripción premium.
        </p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {templates.map((template) => (
          <TemplateCard
            key={template.id}
            template={template}
            isPremiumUser={isPremiumUser}
            isSelected={selectedTemplate === template.id}
            onSelect={handleSelectTemplate}
          />
        ))}
      </div>
    </div>
  );
};

export default TemplateSelector;