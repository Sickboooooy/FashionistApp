import React from 'react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import GoldBorder from '@/components/ui/gold-border';
import PdfExporter from './pdf-exporter';

export interface MagazineContentType {
  title: string;
  subtitle: string;
  introduction: string;
  outfits: Array<{
    id: number;
    name: string;
    description: string;
    occasion: string;
    season?: string;
    pieces?: string[];
    reasoning?: string;
    imageUrl?: string;
    editorial: string;
  }>;
  conclusion: string;
  template: string;
  date?: string;
}

interface MagazinePreviewProps {
  content: MagazineContentType | null;
  templateName: string;
  showWatermark: boolean;
  onBackClick: () => void;
  isGenerating: boolean;
}

const MagazinePreview: React.FC<MagazinePreviewProps> = ({
  content,
  templateName,
  showWatermark,
  onBackClick,
  isGenerating
}) => {
  const shareMagazine = () => {
    // This would be replaced with actual sharing logic
    alert("Función de compartir disponible próximamente");
  };

  if (!content) return null;

  return (
    <div>
      <div className="flex justify-end mb-4 space-x-3">
        <Button 
          variant="outline" 
          className="border-gold-light text-gold-light hover:bg-amber-deep/10"
          onClick={onBackClick}
        >
          Volver a Editar
        </Button>
        <Button 
          variant="outline" 
          className="border-gold-light text-gold-light hover:bg-amber-deep/10"
          onClick={shareMagazine}
        >
          Compartir
        </Button>
        <PdfExporter 
          magazineContent={content} 
          isGenerating={isGenerating}
          showWatermark={showWatermark} 
        />
      </div>
      
      <GoldBorder className="p-2 md:p-6 gold-glow">
        {/* Magazine Preview Layout */}
        <div className="magazine-layout bg-white text-black relative">
          {/* Magazine header */}
          <div className="magazine-header bg-black p-8 text-center">
            <h1 className="font-playfair text-3xl text-amber-deep mb-1">
              {content.title}
            </h1>
            <h2 className="font-cormorant text-xl text-gold-light mb-4">
              {content.subtitle}
            </h2>
            <p className="font-cormorant text-cream-soft/90 max-w-2xl mx-auto">
              {content.introduction}
            </p>
            <div className="mt-4 text-amber-deep/60 text-sm font-cormorant">
              {content.date} • {templateName} Edition
            </div>
          </div>
          
          {/* Magazine content */}
          <div className="magazine-content grid grid-cols-1 md:grid-cols-2 gap-8 p-8">
            {content.outfits.map((outfit, index) => (
              <div key={outfit.id} className="magazine-article">
                {/* Article header */}
                <h3 className="font-playfair text-xl text-amber-deep mb-2">
                  {outfit.name}
                </h3>
                
                <div className="flex flex-col md:flex-row gap-4">
                  {/* Image placeholder */}
                  <div className="md:w-1/2 aspect-square bg-gray-100 flex items-center justify-center rounded overflow-hidden">
                    {outfit.imageUrl ? (
                      <img 
                        src={outfit.imageUrl} 
                        alt={outfit.name} 
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span className="text-gray-400">Imagen del outfit</span>
                    )}
                  </div>
                  
                  {/* Article content */}
                  <div className="md:w-1/2 flex flex-col space-y-3">
                    <p className="text-sm italic text-gray-600">
                      Para {outfit.occasion}
                    </p>
                    <p className="text-sm">
                      {outfit.editorial}
                    </p>
                    
                    {outfit.pieces && outfit.pieces.length > 0 && (
                      <div>
                        <p className="text-xs text-amber-deep uppercase font-semibold mt-2 mb-1">
                          Piezas Destacadas
                        </p>
                        <ul className="text-xs text-gray-700 list-disc pl-4">
                          {outfit.pieces.slice(0, 3).map((piece, i) => (
                            <li key={i}>{piece}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
                
                <Separator className="my-6 bg-amber-deep/30" />
              </div>
            ))}
          </div>
          
          {/* Magazine footer */}
          <div className="magazine-footer p-8 bg-black">
            <p className="font-cormorant text-center text-cream-soft italic">
              {content.conclusion}
            </p>
            
            <div className="flex justify-center mt-6">
              <span className="text-amber-deep font-playfair text-lg">
                SELENE STYLE
              </span>
            </div>
          </div>
          
          {/* Watermark for non-premium users */}
          {showWatermark && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="rotate-45 text-amber-deep/20 text-8xl font-playfair">
                SELENE PREVIEW
              </div>
            </div>
          )}
        </div>
      </GoldBorder>
    </div>
  );
};

export default MagazinePreview;