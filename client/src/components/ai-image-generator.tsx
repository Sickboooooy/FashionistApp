import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import GoldBorder from "@/components/ui/gold-border";
import { usePreferences } from "@/contexts/preferences-context";

import { Loader2, Sparkles, Palette, Shirt, Calendar } from "lucide-react";

// Helper: Convert hex color to name
const colorNames: Record<string, string> = {
  '#000000': 'negro',
  '#FFFFFF': 'blanco',
  '#0047AB': 'azul cobalto',
  '#8B0000': 'rojo oscuro',
  '#006400': 'verde oscuro',
  '#800080': 'púrpura',
  '#FFD700': 'dorado',
  '#C0C0C0': 'plateado',
  '#8B4513': 'marrón',
  '#FF69B4': 'rosa'
};

const getColorName = (hex: string): string => colorNames[hex.toUpperCase()] || hex;

const AIImageGenerator = () => {
  // Get user preferences
  const { preferences } = usePreferences();
  const [useMyPreferences, setUseMyPreferences] = useState(true);
  
  const [prompt, setPrompt] = useState("");
  const [style, setStyle] = useState<"vivid" | "natural">("vivid");
  const [size, setSize] = useState<"1024x1024" | "1792x1024" | "1024x1792">("1024x1024");
  const [quality, setQuality] = useState<"standard" | "hd">("standard");
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [imageHistory, setImageHistory] = useState<Array<{image: string, prompt: string}>>([]);
  const [showShoppingOptions, setShowShoppingOptions] = useState(false);
  const [suggestedPrompts, setSuggestedPrompts] = useState([
    "Vestido elegante negro para evento formal",
    "Conjunto casual de verano para playa",
    "Traje de negocios moderno con detalles dorados",
    "Look bohemio con accesorios étnicos",
    "Outfit minimalista en tonos neutros"
  ]);

  // Build enhanced prompt with preferences
  const buildPreferencesPrompt = (basePrompt: string): string => {
    if (!useMyPreferences) return basePrompt;
    
    const parts: string[] = [basePrompt];
    
    // Add colors
    if (preferences.colors && preferences.colors.length > 0) {
      const colorList = preferences.colors.slice(0, 3).map(getColorName).join(', ');
      parts.push(`colores preferidos: ${colorList}`);
    }
    
    // Add styles
    if (preferences.styles && preferences.styles.length > 0) {
      parts.push(`estilo: ${preferences.styles.join(', ')}`);
    }
    
    // Add seasons
    if (preferences.seasons && preferences.seasons.length > 0) {
      parts.push(`temporada: ${preferences.seasons.join(', ')}`);
    }
    
    // Add top occasion
    if (preferences.occasions && preferences.occasions.length > 0) {
      const topOccasion = preferences.occasions.reduce((prev, curr) => 
        curr.priority > prev.priority ? curr : prev
      );
      parts.push(`ocasión: ${topOccasion.name}`);
    }
    
    return parts.join(', ');
  };

  const handleGenerateImage = async () => {
    if (!prompt.trim()) {
      setError("Por favor, ingresa una descripción para la imagen");
      return;
    }

    setIsLoading(true);
    setError(null);
    
    try {
      // Validación adicional
      if (prompt.length < 10) {
        setError("La descripción es demasiado corta. Añade más detalles para mejores resultados.");
        setIsLoading(false);
        return;
      }
      
      // Mostrar mensaje de proceso
      const processingMessages = [
        "Creando tu diseño de moda...",
        "Procesando tu solicitud...",
        "Generando imagen con IA...",
        "Aplicando estilos de diseño...",
        "Casi listo..."
      ];
      
      let messageIndex = 0;
      const messageInterval = setInterval(() => {
        if (messageIndex < processingMessages.length - 1) {
          setError(processingMessages[messageIndex]);
          messageIndex++;
        }
      }, 5000);
      
      // Configurar timeout para la solicitud
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 60000); // 60 segundos de timeout
      
      try {
        // Build prompt with preferences if enabled
        const enhancedPrompt = buildPreferencesPrompt(prompt);
        
        const response = await fetch("/api/generate-fashion-image", {
          method: "POST",
          body: JSON.stringify({
            prompt: enhancedPrompt,
            style,
            size,
            quality,
            // Pass preferences for backend processing
            preferences: useMyPreferences ? preferences : undefined
          }),
          headers: {
            "Content-Type": "application/json"
          },
          signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        clearInterval(messageInterval);
        
        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`Error HTTP ${response.status}: ${errorText}`);
        }
        
        const data = await response.json();
        
        if (data.success) {
          // Asegurarnos de que la ruta de la imagen es correcta para el frontend
          const imagePath = data.imagePath || "";
          
          // Construir la URL completa de la imagen
          const imageUrl = `http://localhost:5000/${imagePath}`;
          
          // Para SVGs, no necesitamos validación previa
          if (imagePath.endsWith('.svg')) {
            setGeneratedImage(imageUrl);
            
            // Actualizar historial y prompts sugeridos
            const newHistoryItem = { image: imageUrl, prompt: prompt };
            setImageHistory(prev => [newHistoryItem, ...prev.slice(0, 9)]);
            
            // Generar sugerencias relacionadas
            const keywords = prompt.toLowerCase().split(' ');
            if (keywords.length >= 3) {
              const newSuggestions = [
                `${['Vestido', 'Conjunto', 'Traje', 'Look'][Math.floor(Math.random() * 4)]} ${keywords[0]} ${keywords[1]} con toques modernos`,
                `${['Outfit', 'Atuendo', 'Estilo'][Math.floor(Math.random() * 3)]} inspirado en ${keywords[2] || 'elegancia'}`,
                `${['Traje', 'Estilo', 'Conjunto', 'Atuendo'][Math.floor(Math.random() * 4)]} ${keywords[2] || 'formal'} inspirado en ${['París', 'Milán', 'Nueva York', 'Tokio'][Math.floor(Math.random() * 4)]}`,
                `${['Vestido', 'Falda', 'Blusa', 'Pantalón'][Math.floor(Math.random() * 4)]} con patrón ${['floral', 'geométrico', 'abstracto', 'rayado'][Math.floor(Math.random() * 4)]} para ${['oficina', 'evento casual', 'salida nocturna', 'cena'][Math.floor(Math.random() * 4)]}`
              ];
              
              setSuggestedPrompts(newSuggestions);
            }
          } else {
            // Para otros tipos de imagen, verificar que se puede cargar
            const img = new Image();
            img.onload = () => {
              setGeneratedImage(imageUrl);
              
              // Actualizar historial y prompts sugeridos
              const newHistoryItem = { image: imageUrl, prompt: prompt };
              setImageHistory(prev => [newHistoryItem, ...prev.slice(0, 9)]);
              
              // Generar sugerencias relacionadas
              const keywords = prompt.toLowerCase().split(' ');
              if (keywords.length >= 3) {
                const newSuggestions = [
                  `${['Vestido', 'Conjunto', 'Traje', 'Look'][Math.floor(Math.random() * 4)]} ${keywords[0]} ${keywords[1]} con toques modernos`,
                  `${['Outfit', 'Atuendo', 'Estilo'][Math.floor(Math.random() * 3)]} inspirado en ${keywords[2] || 'elegancia'}`,
                  `${['Traje', 'Estilo', 'Conjunto', 'Atuendo'][Math.floor(Math.random() * 4)]} ${keywords[2] || 'formal'} inspirado en ${['París', 'Milán', 'Nueva York', 'Tokio'][Math.floor(Math.random() * 4)]}`,
                  `${['Vestido', 'Falda', 'Blusa', 'Pantalón'][Math.floor(Math.random() * 4)]} con patrón ${['floral', 'geométrico', 'abstracto', 'rayado'][Math.floor(Math.random() * 4)]} para ${['oficina', 'evento casual', 'salida nocturna', 'cena'][Math.floor(Math.random() * 4)]}`
                ];
                
                setSuggestedPrompts(newSuggestions);
              }
            };
            img.onerror = () => {
              setError("Error al cargar la imagen generada");
            };
            img.src = imageUrl;
          }
          
          setError(null);
          
          // Guardar en historial
          setImageHistory(prev => [{image: imageUrl, prompt}, ...prev.slice(0, 3)]);
          
          // Guardar historial en localStorage para persistencia
          const updatedHistory = [{image: imageUrl, prompt}, ...imageHistory.slice(0, 3)];
          localStorage.setItem('image_history', JSON.stringify(updatedHistory));
          
          // Actualizar sugerencias de prompts basadas en el historial reciente
          if (imageHistory.length >= 2) {
            // Generar nuevas sugerencias basadas en historial reciente
            const recentPrompts = [prompt, ...imageHistory.slice(0, 2).map(item => item.prompt)];
            
            // Extraer palabras clave de los prompts recientes
            const keywordExtractor = (text: string) => {
              const words = text.toLowerCase().split(/\s+/);
              return words.filter(word => word.length > 4 && !['para', 'como', 'este', 'esta', 'estos', 'estas', 'con', 'sin'].includes(word));
            };
            
            const keywordsSet = new Set<string>();
            recentPrompts.forEach(p => {
              keywordExtractor(p).forEach(word => keywordsSet.add(word));
            });
            
            // Usar algunas palabras clave para generar nuevas sugerencias
            if (keywordsSet.size > 0) {
              const keywords = Array.from(keywordsSet).slice(0, 3);
              
              const newSuggestions = [
                `${keywords[0] || 'Vestido'} elegante para ${['fiesta', 'evento formal', 'ceremonia', 'noche especial'][Math.floor(Math.random() * 4)]}`,
                `Conjunto ${['casual', 'urbano', 'moderno', 'minimalista'][Math.floor(Math.random() * 4)]} con ${keywords[1] || 'accesorios'} para ${['día', 'tarde', 'fin de semana', 'diario'][Math.floor(Math.random() * 4)]}`,
                `Look ${['bohemio', 'elegante', 'sofisticado', 'atrevido'][Math.floor(Math.random() * 4)]} en tonos ${['pastel', 'neutros', 'brillantes', 'oscuros'][Math.floor(Math.random() * 4)]} para ${['primavera', 'verano', 'otoño', 'invierno'][Math.floor(Math.random() * 4)]}`,
                `${['Traje', 'Estilo', 'Conjunto', 'Atuendo'][Math.floor(Math.random() * 4)]} ${keywords[2] || 'formal'} inspirado en ${['París', 'Milán', 'Nueva York', 'Tokio'][Math.floor(Math.random() * 4)]}`,
                `${['Vestido', 'Falda', 'Blusa', 'Pantalón'][Math.floor(Math.random() * 4)]} con patrón ${['floral', 'geométrico', 'abstracto', 'rayado'][Math.floor(Math.random() * 4)]} para ${['oficina', 'evento casual', 'salida nocturna', 'cena'][Math.floor(Math.random() * 4)]}`
              ];
              
              setSuggestedPrompts(newSuggestions);
            }
          }
        } else {
          setError(data.error || "No se pudo generar la imagen. Intenta con otra descripción.");
        }
      } catch (fetchError: any) {
        clearTimeout(timeoutId);
        clearInterval(messageInterval);
        
        if (fetchError.name === 'AbortError') {
          setError("La solicitud tomó demasiado tiempo. Intenta con una descripción más corta o específica.");
        } else {
          throw fetchError;
        }
      }
    } catch (error: any) {
      console.error("Error de generación de imagen:", error);
      setError(error.message || "Error de conexión al servicio de IA. Intenta más tarde.");
    } finally {
      setIsLoading(false);
    }
  };

  const usePromptSuggestion = (suggestion: string) => {
    setPrompt(suggestion);
  };
  
  const findSimilarItems = () => {
    setShowShoppingOptions(true);
  };

  return (
    <div className="max-w-5xl mx-auto p-4 space-y-8">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          <GoldBorder>
            <Card className="bg-black text-amber-50 shadow-lg border-amber-700">
              <CardHeader>
                <CardTitle className="text-center text-2xl bg-gradient-to-r from-amber-400 to-amber-600 bg-clip-text text-transparent">
                Diseños IA
              </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="prompt" className="text-amber-300 flex items-center">
                    <i className="fas fa-magic mr-2 text-amber-500"></i>
                    Descripción del diseño
                  </Label>
                  <Textarea
                    id="prompt"
                    placeholder="Describe el diseño de moda que deseas crear... Sé detallado para mejores resultados."
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    className="min-h-32 bg-black-elegant border-amber-700 text-amber-50 focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label className="text-amber-300 text-xs">Inspiración de prompts</Label>
                  <div className="flex flex-wrap gap-2">
                    {suggestedPrompts.map((suggestion, index) => (
                      <Button 
                        key={index} 
                        variant="outline" 
                        size="sm"
                        className="text-xs border-amber-700/50 text-amber-300 hover:bg-amber-900/30"
                        onClick={() => usePromptSuggestion(suggestion)}
                      >
                        {suggestion}
                      </Button>
                    ))}
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="style" className="text-amber-300 flex items-center">
                      <i className="fas fa-palette mr-2 text-amber-500"></i>
                      Estilo
                    </Label>
                    <Select value={style} onValueChange={(value: "vivid" | "natural") => setStyle(value)}>
                      <SelectTrigger id="style" className="bg-black-elegant border-amber-700 text-amber-50">
                        <SelectValue placeholder="Estilo" />
                      </SelectTrigger>
                      <SelectContent className="bg-black-elegant border-amber-700 text-amber-50">
                        <SelectItem value="vivid">Vívido</SelectItem>
                        <SelectItem value="natural">Natural</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="size" className="text-amber-300 flex items-center">
                      <i className="fas fa-crop-alt mr-2 text-amber-500"></i>
                      Formato
                    </Label>
                    <Select value={size} onValueChange={(value: "1024x1024" | "1792x1024" | "1024x1792") => setSize(value)}>
                      <SelectTrigger id="size" className="bg-black-elegant border-amber-700 text-amber-50">
                        <SelectValue placeholder="Tamaño" />
                      </SelectTrigger>
                      <SelectContent className="bg-black-elegant border-amber-700 text-amber-50">
                        <SelectItem value="1024x1024">Cuadrado</SelectItem>
                        <SelectItem value="1792x1024">Panorámico</SelectItem>
                        <SelectItem value="1024x1792">Vertical</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="quality" className="text-amber-300 flex items-center">
                      <i className="fas fa-star mr-2 text-amber-500"></i>
                      Calidad
                    </Label>
                    <Select value={quality} onValueChange={(value: "standard" | "hd") => setQuality(value)}>
                      <SelectTrigger id="quality" className="bg-black-elegant border-amber-700 text-amber-50">
                        <SelectValue placeholder="Calidad" />
                      </SelectTrigger>
                      <SelectContent className="bg-black-elegant border-amber-700 text-amber-50">
                        <SelectItem value="standard">Estándar</SelectItem>
                        <SelectItem value="hd">Alta Definición</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                {/* Preferences Panel */}
                <div className="border border-amber-700/30 rounded-lg p-4 bg-black-elegant/50">
                  <div className="flex items-center justify-between mb-3">
                    <Label className="text-amber-300 flex items-center gap-2">
                      <Sparkles className="h-4 w-4 text-amber-500" />
                      Usar Mis Preferencias
                    </Label>
                    <button
                      type="button"
                      onClick={() => setUseMyPreferences(!useMyPreferences)}
                      className={`relative w-12 h-6 rounded-full transition-colors ${
                        useMyPreferences ? 'bg-amber-600' : 'bg-gray-700'
                      }`}
                    >
                      <span
                        className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${
                          useMyPreferences ? 'translate-x-6' : ''
                        }`}
                      />
                    </button>
                  </div>
                  
                  {useMyPreferences && (
                    <div className="space-y-3 text-sm">
                      {/* Colors */}
                      {preferences.colors && preferences.colors.length > 0 && (
                        <div className="flex items-center gap-2">
                          <Palette className="h-4 w-4 text-amber-500/70" />
                          <span className="text-amber-300/70">Colores:</span>
                          <div className="flex gap-1">
                            {preferences.colors.slice(0, 5).map((color, i) => (
                              <div
                                key={i}
                                className="w-5 h-5 rounded-full border border-amber-600/50"
                                style={{ backgroundColor: color }}
                                title={getColorName(color)}
                              />
                            ))}
                            {preferences.colors.length > 5 && (
                              <span className="text-amber-300/50 text-xs ml-1">+{preferences.colors.length - 5}</span>
                            )}
                          </div>
                        </div>
                      )}
                      
                      {/* Styles */}
                      {preferences.styles && preferences.styles.length > 0 && (
                        <div className="flex items-center gap-2">
                          <Shirt className="h-4 w-4 text-amber-500/70" />
                          <span className="text-amber-300/70">Estilos:</span>
                          <span className="text-amber-50">{preferences.styles.join(', ')}</span>
                        </div>
                      )}
                      
                      {/* Seasons */}
                      {preferences.seasons && preferences.seasons.length > 0 && (
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-amber-500/70" />
                          <span className="text-amber-300/70">Temporadas:</span>
                          <span className="text-amber-50">{preferences.seasons.join(', ')}</span>
                        </div>
                      )}
                      
                      <a 
                        href="/" 
                        className="text-xs text-amber-400 hover:text-amber-300 underline mt-2 inline-block"
                      >
                        Editar preferencias →
                      </a>
                    </div>
                  )}
                </div>
              </CardContent>
              <CardFooter className="flex flex-col space-y-4">
                <Button 
                  onClick={handleGenerateImage} 
                  disabled={isLoading || !prompt} 
                  className="w-full bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-700 hover:to-amber-800 text-black-elegant font-semibold"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Creando tu diseño con IA Gen...
                    </>
                  ) : (
                    <>
                      <i className="fas fa-wand-magic-sparkles mr-2"></i>
                      Crear Diseño con IA Gen
                    </>
                  )}
                </Button>
                
                {error && (
                  <p className="text-red-500 text-sm text-center">{error}</p>
                )}
              </CardFooter>
            </Card>
          </GoldBorder>
          
          {/* Historial de imágenes generadas */}
          {imageHistory.length > 0 && (
            <div className="mt-8">
              <h3 className="font-playfair text-lg text-amber-400 mb-4">Diseños Recientes</h3>
              <div className="grid grid-cols-3 gap-4">
                {imageHistory.map((item, index) => (
                    <div key={index} className="border border-amber-700/30 rounded-md overflow-hidden relative group">
                      <img 
                        src={item.image} 
                        alt={`Diseño ${index + 1}`} 
                        className="w-full h-32 object-cover"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                        }}
                      />
                      <div className="absolute inset-0 bg-black/70 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <Button 
                          size="sm" 
                          variant="outline" 
                          className="border-amber-600 text-amber-300"
                          onClick={() => {
                            setGeneratedImage(item.image);
                            setPrompt(item.prompt);
                          }}
                        >
                          <i className="fas fa-rotate-left mr-1"></i> Usar
                        </Button>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          )}
        </div>

        {/* Imagen generada y opciones de compra */}
        <div className="lg:col-span-1">
          {(isLoading || generatedImage) && (
            <GoldBorder>
              <Card className="bg-black text-amber-50 shadow-lg border-amber-700">
                <CardHeader>
                  <CardTitle className="text-center text-xl bg-gradient-to-r from-amber-400 to-amber-600 bg-clip-text text-transparent">
                    Tu Diseño
                  </CardTitle>
                </CardHeader>
                <CardContent className="flex justify-center">
                  {isLoading ? (
                    <div className="w-full aspect-square rounded-md bg-black-elegant flex items-center justify-center">
                      <div className="space-y-4 flex flex-col items-center">
                        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-amber-600"></div>
                        <p className="text-amber-300/70 text-sm animate-pulse">Creando tu diseño de moda...</p>
                      </div>
                    </div>
                  ) : generatedImage ? (
                    <div className="relative group w-full">
                      {generatedImage.endsWith('.svg') ? (
                        <div className="max-w-full max-h-96 rounded-md shadow-gold overflow-hidden bg-white">
                          <object 
                            data={generatedImage} 
                            type="image/svg+xml"
                            className="w-full h-96 object-contain"
                          >
                            <img 
                              src={generatedImage} 
                              alt="Diseño generado" 
                              className="w-full h-96 object-contain"
                            />
                          </object>
                        </div>
                      ) : (
                        <img 
                          src={generatedImage} 
                          alt="Diseño generado" 
                          className="w-full max-h-96 object-contain rounded-md shadow-gold"
                        />
                      )}
                      <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <div className="bg-black/50 p-3 rounded-full">
                          <Button 
                            size="sm"
                            variant="ghost" 
                            className="text-white hover:text-amber-300"
                            onClick={() => window.open(generatedImage || "", "_blank")}
                          >
                            <i className="fas fa-expand mr-1"></i>
                          </Button>
                        </div>
                      </div>
                    </div>
                  ) : null}
                </CardContent>
                {generatedImage && (
                  <CardFooter className="flex flex-col space-y-4">
                    <div className="grid grid-cols-2 gap-2 w-full">
                      <Button 
                        variant="outline" 
                        className="border-amber-600 text-amber-300 hover:bg-amber-900/30"
                        onClick={findSimilarItems}
                      >
                        <i className="fas fa-shopping-bag mr-2"></i>
                        Encontrar Similar
                      </Button>
                      <Button 
                        variant="outline" 
                        className="border-amber-600 text-amber-300 hover:bg-amber-900/30"
                      >
                        <i className="fas fa-share-alt mr-2"></i>
                        Compartir
                      </Button>
                    </div>

                    {/* Opciones de compra simuladas */}
                    {showShoppingOptions && (
                      <div className="mt-4 border-t border-amber-700/30 pt-4 w-full">
                        <h4 className="text-amber-300 text-sm mb-3">Artículos similares:</h4>
                        <div className="space-y-3">
                          {[1, 2, 3].map((item) => (
                            <a 
                              key={item}
                              href="#" 
                              className="flex items-center p-2 border border-amber-700/20 rounded-md hover:bg-amber-900/10 transition-colors"
                            >
                              <div className="w-16 h-16 bg-black-elegant rounded-md overflow-hidden mr-3">
                                <img 
                                  src={`https://source.unsplash.com/random/100x100/?fashion,item${item}`} 
                                  alt={`Artículo similar ${item}`}
                                  className="w-full h-full object-cover"
                                />
                              </div>
                              <div className="flex-1">
                                <h5 className="text-amber-200 text-sm">Producto similar #{item}</h5>
                                <p className="text-amber-100/70 text-xs">{Math.floor(Math.random() * 150) + 50}€</p>
                                <p className="text-xs text-amber-300/50">Tienda {item}</p>
                              </div>
                            </a>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardFooter>
                )}
              </Card>
            </GoldBorder>
          )}
        </div>
      </div>
    </div>
  );
};

export default AIImageGenerator;