import React from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import GoldBorder from '@/components/ui/gold-border';

export interface MagazineTemplate {
  id: string;
  name: string;
  type: 'free' | 'premium';
  image: string;
}

interface TemplateSelectorProps {
  templates: MagazineTemplate[];
  selectedTemplate: string;
  onTemplateChange: (templateId: string) => void;
  isPremiumUser: boolean;
}

const TemplateSelector: React.FC<TemplateSelectorProps> = ({
  templates,
  selectedTemplate,
  onTemplateChange,
  isPremiumUser
}) => {
  const selectedTemplateInfo = templates.find(t => t.id === selectedTemplate);
  const isPremiumTemplate = selectedTemplateInfo?.type === 'premium';
  
  return (
    <GoldBorder className="p-6 gold-glow">
      <h2 className="font-playfair text-xl gold-text mb-4">Plantilla de Revista</h2>
      
      <div className="space-y-4">
        <Select 
          value={selectedTemplate} 
          onValueChange={value => onTemplateChange(value)}
        >
          <SelectTrigger className="border-amber-deep/30 bg-black-elegant">
            <SelectValue placeholder="Selecciona una plantilla" />
          </SelectTrigger>
          <SelectContent className="bg-black-elegant border-amber-deep/30">
            {templates.map((template) => (
              <SelectItem 
                key={template.id} 
                value={template.id}
                className="focus:bg-amber-deep/10 focus:text-gold-light"
              >
                {template.name} 
                {template.type === 'premium' && 
                  <Badge className="ml-2 bg-amber-deep text-black text-xs">Premium</Badge>
                }
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        
        <div className="aspect-[3/4] bg-black-elegant border border-amber-deep/40 rounded-md overflow-hidden">
          {/* Template preview image would go here */}
          <div className="h-full flex items-center justify-center">
            <p className="font-cormorant italic text-amber-deep/60">
              Vista previa: {selectedTemplateInfo?.name}
            </p>
          </div>
        </div>
        
        {isPremiumTemplate && !isPremiumUser && (
          <div className="bg-amber-deep/10 border border-amber-deep/30 rounded-md p-3 text-sm">
            <p className="font-cormorant text-gold-light">
              Esta es una plantilla premium. La versión generada incluirá una marca de agua.
              <a href="#" className="underline ml-1">Actualiza a premium</a>
            </p>
          </div>
        )}
      </div>
    </GoldBorder>
  );
};

export default TemplateSelector;