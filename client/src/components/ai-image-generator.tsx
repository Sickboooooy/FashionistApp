import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import GoldBorder from "@/components/ui/gold-border";

import { Loader2 } from "lucide-react";

const AIImageGenerator = () => {
  const [prompt, setPrompt] = useState("");
  const [style, setStyle] = useState<"vivid" | "natural">("vivid");
  const [size, setSize] = useState<"1024x1024" | "1792x1024" | "1024x1792">("1024x1024");
  const [quality, setQuality] = useState<"standard" | "hd">("standard");
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGenerateImage = async () => {
    if (!prompt) {
      setError("Por favor, ingresa una descripción para la imagen");
      return;
    }

    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetch("/api/generate-fashion-image", {
        method: "POST",
        body: JSON.stringify({
          prompt,
          style,
          size,
          quality
        }),
        headers: {
          "Content-Type": "application/json"
        }
      });
      
      const data = await response.json();
      
      if (data.success) {
        setGeneratedImage("/" + data.imagePath);
      } else {
        setError(data.error || "Error al generar la imagen");
      }
    } catch (error: any) {
      setError(error.message || "Error de conexión");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-4 space-y-8">
      <GoldBorder>
        <Card className="bg-black text-amber-50 shadow-lg border-amber-700">
          <CardHeader>
            <CardTitle className="text-center text-2xl text-amber-500">
              Generador de Imágenes de Moda con IA
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="prompt" className="text-amber-300">Descripción de la imagen</Label>
              <Textarea
                id="prompt"
                placeholder="Describe la imagen de moda que deseas crear..."
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                className="min-h-24 bg-black-elegant border-amber-700 text-amber-50"
              />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="style" className="text-amber-300">Estilo</Label>
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
                <Label htmlFor="size" className="text-amber-300">Tamaño</Label>
                <Select value={size} onValueChange={(value: "1024x1024" | "1792x1024" | "1024x1792") => setSize(value)}>
                  <SelectTrigger id="size" className="bg-black-elegant border-amber-700 text-amber-50">
                    <SelectValue placeholder="Tamaño" />
                  </SelectTrigger>
                  <SelectContent className="bg-black-elegant border-amber-700 text-amber-50">
                    <SelectItem value="1024x1024">Cuadrado (1024x1024)</SelectItem>
                    <SelectItem value="1792x1024">Panorámico (1792x1024)</SelectItem>
                    <SelectItem value="1024x1792">Vertical (1024x1792)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="quality" className="text-amber-300">Calidad</Label>
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
          </CardContent>
          <CardFooter className="flex flex-col space-y-4">
            <Button 
              onClick={handleGenerateImage} 
              disabled={isLoading || !prompt} 
              className="w-full bg-amber-600 hover:bg-amber-700 text-black-elegant"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Generando...
                </>
              ) : "Generar Imagen"}
            </Button>
            
            {error && (
              <p className="text-red-500 text-sm text-center">{error}</p>
            )}
          </CardFooter>
        </Card>
      </GoldBorder>

      {(isLoading || generatedImage) && (
        <GoldBorder>
          <Card className="bg-black text-amber-50 shadow-lg border-amber-700">
            <CardHeader>
              <CardTitle className="text-center text-xl text-amber-500">
                Imagen Generada
              </CardTitle>
            </CardHeader>
            <CardContent className="flex justify-center">
              {isLoading ? (
                <Skeleton className="w-full aspect-square max-w-md rounded-md bg-amber-900/20" />
              ) : generatedImage ? (
                <img 
                  src={generatedImage} 
                  alt="Imagen generada por IA" 
                  className="max-w-full max-h-96 object-contain rounded-md shadow-gold"
                />
              ) : null}
            </CardContent>
            {generatedImage && (
              <CardFooter className="justify-center">
                <Button 
                  onClick={() => window.open(generatedImage || "", "_blank")}
                  variant="outline"
                  className="border-amber-600 text-amber-300 hover:bg-amber-900/30"
                >
                  Ver Tamaño Completo
                </Button>
              </CardFooter>
            )}
          </Card>
        </GoldBorder>
      )}
    </div>
  );
};

export default AIImageGenerator;