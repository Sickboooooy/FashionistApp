import { FC, useEffect, useState } from 'react';
import { MagazineTemplate } from './template-selector';
import { Outfit } from '@/contexts/outfit-context';
import GoldBorder from '@/components/ui/gold-border';
import GoldText from '@/components/ui/gold-text';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { apiRequest } from '@/lib/queryClient';
import { Loader2, RefreshCw } from 'lucide-react';

export interface MagazineContent {
  title: string;
  subtitle: string;
  introduction: string;
  outfits: Array<Outfit & { editorial: string }>;
  conclusion: string;
  template: string;
}

interface MagazinePreviewProps {
  selectedTemplate: MagazineTemplate;
  selectedOutfits: Outfit[];
  userPreferences?: {
    styles?: string[];
    occasions?: { name: string; priority: number }[];
    seasons?: string[];
  };
  userName?: string;
  isPremiumUser?: boolean;
  onContentGenerated?: (content: MagazineContent) => void;
}

const MagazinePreview: FC<MagazinePreviewProps> = ({
  selectedTemplate,
  selectedOutfits,
  userPreferences,
  userName,
  isPremiumUser = false,
  onContentGenerated
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [magazineContent, setMagazineContent] = useState<MagazineContent | null>(null);
  const [activeTab, setActiveTab] = useState('preview');

  useEffect(() => {
    // Reset magazine content when inputs change
    setMagazineContent(null);
  }, [selectedTemplate, selectedOutfits]);

  const generateMagazineContent = async () => {
    if (selectedOutfits.length === 0) {
      setError('Selecciona al menos un conjunto para generar la revista.');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/generate-magazine', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          outfits: selectedOutfits,
          template: selectedTemplate,
          userPreferences,
          userName
        }),
      });

      if (!response.ok) {
        throw new Error('Error en la respuesta del servidor');
      }
      
      const data = await response.json();
      setMagazineContent(data);
      
      if (onContentGenerated) {
        onContentGenerated(data);
      }
    } catch (err: any) {
      setError(err.message || 'Ha ocurrido un error al generar el contenido de la revista.');
    } finally {
      setIsLoading(false);
    }
  };

  const renderWatermark = () => {
    if (isPremiumUser) return null;
    
    return (
      <div className="absolute bottom-6 right-6 opacity-50">
        <p className="text-xs text-amber-deep">
          Versión gratuita - Actualiza a Premium para eliminar la marca de agua
        </p>
      </div>
    );
  };

  const renderMagazineCover = () => {
    if (!magazineContent) {
      return (
        <div className="aspect-[3/4] w-full max-w-xl mx-auto bg-black-elegant border border-amber-deep/40 flex flex-col items-center justify-center p-8 text-center">
          <GoldText className="text-2xl mb-4">Vista Previa no Disponible</GoldText>
          <p className="text-muted-foreground mb-6">
            Genera el contenido de la revista para ver una vista previa.
          </p>
          <Button 
            onClick={generateMagazineContent}
            disabled={isLoading || selectedOutfits.length === 0}
            className="gold-button"
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Generando...
              </>
            ) : (
              'Generar Contenido'
            )}
          </Button>
        </div>
      );
    }

    return (
      <div className="aspect-[3/4] w-full max-w-xl mx-auto relative">
        <GoldBorder className="w-full h-full p-8 flex flex-col">
          <div className="text-center mb-6">
            <h1 className="text-4xl font-bold mb-2">
              <GoldText>{magazineContent.title}</GoldText>
            </h1>
            <p className="text-amber-deep/70 text-sm">{magazineContent.subtitle}</p>
          </div>

          {/* Template-specific cover layout */}
          <div className="flex-1 overflow-hidden">
            {selectedTemplate === 'vogue' && (
              <div className="h-full flex flex-col">
                <div className="flex-1 overflow-hidden mb-4">
                  {magazineContent.outfits[0] && (
                    <img 
                      src={magazineContent.outfits[0].imageUrl} 
                      alt={magazineContent.outfits[0].name}
                      className="w-full h-full object-cover"
                    />
                  )}
                </div>
                <p className="text-sm text-muted-foreground italic">
                  {magazineContent.introduction.split('.')[0]}.
                </p>
              </div>
            )}

            {selectedTemplate === 'elle' && (
              <div className="h-full flex space-x-4">
                <div className="flex-1 overflow-hidden">
                  {magazineContent.outfits[0] && (
                    <img 
                      src={magazineContent.outfits[0].imageUrl} 
                      alt={magazineContent.outfits[0].name}
                      className="w-full h-full object-cover"
                    />
                  )}
                </div>
                <div className="flex-1 overflow-hidden">
                  {magazineContent.outfits[1] ? (
                    <img 
                      src={magazineContent.outfits[1].imageUrl} 
                      alt={magazineContent.outfits[1].name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-black-elegant/50 flex items-center justify-center">
                      <p className="text-amber-deep/50 text-sm">Selecciona más conjuntos</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {selectedTemplate === 'bazaar' && (
              <div className="h-full flex flex-col">
                <div className="flex-1 overflow-hidden mb-4">
                  {magazineContent.outfits[0] && (
                    <img 
                      src={magazineContent.outfits[0].imageUrl} 
                      alt={magazineContent.outfits[0].name}
                      className="w-full h-full object-cover"
                    />
                  )}
                </div>
                <div className="h-24 flex space-x-4">
                  <div className="flex-1 overflow-hidden">
                    {magazineContent.outfits[1] ? (
                      <img 
                        src={magazineContent.outfits[1].imageUrl} 
                        alt={magazineContent.outfits[1].name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full bg-black-elegant/50 flex items-center justify-center">
                        <p className="text-amber-deep/50 text-xs">+</p>
                      </div>
                    )}
                  </div>
                  <div className="flex-1 overflow-hidden">
                    {magazineContent.outfits[2] ? (
                      <img 
                        src={magazineContent.outfits[2].imageUrl} 
                        alt={magazineContent.outfits[2].name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full bg-black-elegant/50 flex items-center justify-center">
                        <p className="text-amber-deep/50 text-xs">+</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {selectedTemplate === 'vanity' && (
              <div className="h-full flex flex-col">
                <p className="text-amber-deep/90 text-sm italic mb-4">
                  {magazineContent.introduction.split('.').slice(0, 2).join('.') + '.'}
                </p>
                <div className="flex-1 overflow-hidden">
                  {magazineContent.outfits[0] && (
                    <img 
                      src={magazineContent.outfits[0].imageUrl} 
                      alt={magazineContent.outfits[0].name}
                      className="w-full h-full object-cover"
                    />
                  )}
                </div>
              </div>
            )}

            {selectedTemplate === 'selene' && (
              <div className="h-full border-4 border-amber-deep/20 p-4 flex flex-col">
                <div className="flex-1 overflow-hidden">
                  {magazineContent.outfits[0] && (
                    <img 
                      src={magazineContent.outfits[0].imageUrl} 
                      alt={magazineContent.outfits[0].name}
                      className="w-full h-full object-cover"
                    />
                  )}
                </div>
                <div className="mt-4 text-center">
                  <p className="text-amber-deep font-semibold">
                    Selene Signature Collection
                  </p>
                </div>
              </div>
            )}
          </div>
        </GoldBorder>
        {renderWatermark()}
      </div>
    );
  };

  const renderEditorView = () => {
    if (!magazineContent) {
      return (
        <div className="w-full flex flex-col items-center justify-center py-8">
          <p className="text-muted-foreground mb-4">
            Genera el contenido de la revista para ver los detalles.
          </p>
          <Button 
            onClick={generateMagazineContent}
            disabled={isLoading || selectedOutfits.length === 0}
            className="gold-button"
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Generando...
              </>
            ) : (
              'Generar Contenido'
            )}
          </Button>
        </div>
      );
    }

    return (
      <div className="w-full overflow-auto p-4">
        <div className="mb-6">
          <h2 className="text-xl font-bold">
            <GoldText>Título y Subtítulo</GoldText>
          </h2>
          <div className="mt-2 p-4 bg-black-elegant/50 rounded-md">
            <p className="font-bold text-lg">{magazineContent.title}</p>
            <p className="text-sm text-muted-foreground">{magazineContent.subtitle}</p>
          </div>
        </div>

        <div className="mb-6">
          <h2 className="text-xl font-bold">
            <GoldText>Introducción</GoldText>
          </h2>
          <div className="mt-2 p-4 bg-black-elegant/50 rounded-md">
            <p className="text-sm">{magazineContent.introduction}</p>
          </div>
        </div>

        <div className="mb-6">
          <h2 className="text-xl font-bold">
            <GoldText>Conjuntos y Reseñas</GoldText>
          </h2>
          <div className="mt-2 space-y-4">
            {magazineContent.outfits.map((outfit, index) => (
              <div key={outfit.id} className="p-4 bg-black-elegant/50 rounded-md">
                <div className="flex items-start gap-4">
                  <div className="w-24 h-24 flex-shrink-0">
                    <GoldBorder className="w-full h-full overflow-hidden">
                      <img 
                        src={outfit.imageUrl} 
                        alt={outfit.name}
                        className="w-full h-full object-cover"
                      />
                    </GoldBorder>
                  </div>
                  <div className="flex-1">
                    <p className="font-bold text-amber-deep">{outfit.name}</p>
                    <p className="text-xs text-muted-foreground mb-2">
                      {outfit.occasion} • {outfit.season}
                    </p>
                    <p className="text-sm">{outfit.editorial}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="mb-6">
          <h2 className="text-xl font-bold">
            <GoldText>Conclusión</GoldText>
          </h2>
          <div className="mt-2 p-4 bg-black-elegant/50 rounded-md">
            <p className="text-sm">{magazineContent.conclusion}</p>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="w-full py-6">
      <div className="mb-8 text-center">
        <h2 className="text-3xl font-bold mb-2">
          <GoldText>Previsualización de Revista</GoldText>
        </h2>
        <p className="text-muted-foreground max-w-2xl mx-auto">
          Vista previa de tu revista personalizada. Genera el contenido para ver cómo quedará el resultado final.
        </p>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-900/20 border border-red-800 rounded-md text-center">
          <p className="text-red-400">{error}</p>
        </div>
      )}

      <div className="mb-4 flex justify-center">
        {magazineContent && (
          <Button 
            variant="outline" 
            size="sm" 
            onClick={generateMagazineContent}
            disabled={isLoading}
            className="flex items-center"
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            Regenerar Contenido
          </Button>
        )}
      </div>

      <Tabs 
        value={activeTab} 
        onValueChange={setActiveTab}
        className="w-full"
      >
        <div className="flex justify-center mb-6">
          <TabsList>
            <TabsTrigger value="preview">Vista Previa</TabsTrigger>
            <TabsTrigger value="editor">Contenido</TabsTrigger>
          </TabsList>
        </div>
        
        <TabsContent value="preview" className="mt-0">
          {renderMagazineCover()}
        </TabsContent>
        
        <TabsContent value="editor" className="mt-0">
          {renderEditorView()}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default MagazinePreview;