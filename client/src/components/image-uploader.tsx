import { useState, useRef } from 'react';
import { useOutfit } from '../contexts/outfit-context';
import { useToast } from '@/hooks/use-toast';
import GoldBorder from './ui/gold-border';

const ImageUploader = () => {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { uploadImage, isLoading } = useOutfit();
  const { toast } = useToast();
  
  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };
  
  const handleDragLeave = () => {
    setIsDragging(false);
  };
  
  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };
  
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  };
  
  const handleFile = (file: File) => {
    // Check if file is an image
    if (!file.type.startsWith('image/')) {
      toast({
        title: 'Tipo de archivo inválido',
        description: 'Por favor, sube un archivo de imagen (JPG, PNG, WEBP)',
        variant: 'destructive',
      });
      return;
    }
    
    // Create preview
    const reader = new FileReader();
    reader.onload = (e) => {
      setPreviewUrl(e.target?.result as string);
    };
    reader.readAsDataURL(file);
  };
  
  const handleSubmit = async () => {
    if (!previewUrl) {
      toast({
        title: 'No se seleccionó imagen',
        description: 'Sube una imagen primero',
        variant: 'destructive',
      });
      return;
    }
    
    // Convert data URL to File object
    const fetchRes = await fetch(previewUrl);
    const blob = await fetchRes.blob();
    const file = new File([blob], 'uploaded-image.jpg', { type: 'image/jpeg' });
    
    try {
      await uploadImage(file);
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to process image',
        variant: 'destructive',
      });
    }
  };
  
  const handleReset = () => {
    setPreviewUrl(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };
  
  return (
    <div className="w-full max-w-md mx-auto">
      <GoldBorder 
        className={`p-8 relative ${isDragging ? 'border-amber-500/50 bg-amber-500/5' : ''} transition-colors`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {previewUrl ? (
          <div className="text-center">
            <div className="relative w-64 h-64 mx-auto mb-4 overflow-hidden rounded-lg">
              <img 
                src={previewUrl} 
                alt="Preview" 
                className="object-cover w-full h-full"
              />
              <button
                type="button"
                onClick={handleReset}
                className="absolute top-2 right-2 bg-stone-950/80 text-stone-300 rounded-full p-1.5 hover:bg-stone-900 border border-amber-500/20"
                aria-label="Remove image"
              >
                <i className="fas fa-times"></i>
              </button>
            </div>
            
            <button
              type="button"
              onClick={handleSubmit}
              disabled={isLoading}
              className="gold-button gold-shine font-montserrat text-xs font-medium uppercase tracking-wider px-8 py-3 rounded-full"
            >
              {isLoading ? 'Generando outfits...' : 'Generar outfits'}
            </button>
          </div>
        ) : (
          <div className="text-center">
            <div className="mb-4">
              <i className="fas fa-cloud-upload-alt text-4xl text-amber-500/60"></i>
            </div>
            <h3 className="font-serif text-xl mb-2 text-stone-100">Sube una Prenda</h3>
            <p className="text-stone-400 font-light mb-6">
              Arrastra y suelta una imagen de tu prenda o haz clic para buscar
            </p>
            
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="gold-button gold-shine font-montserrat text-xs font-medium uppercase tracking-wider px-8 py-3 rounded-full"
            >
              Seleccionar imagen
            </button>
            
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
            />
            
            <p className="mt-4 text-stone-500 text-sm font-light">
              Formatos permitidos: JPG, PNG, WEBP
            </p>
          </div>
        )}
      </GoldBorder>
    </div>
  );
};

export default ImageUploader;