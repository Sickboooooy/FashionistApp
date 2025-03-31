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
        title: 'Invalid File Type',
        description: 'Please upload an image file (JPG, PNG, WEBP)',
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
        title: 'No Image Selected',
        description: 'Please upload an image first',
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
        className={`p-8 relative ${isDragging ? 'bg-amber-50/10' : ''} transition-colors`}
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
                className="absolute top-2 right-2 bg-black/70 text-cream-soft rounded-full p-1 hover:bg-black"
                aria-label="Remove image"
              >
                <i className="fas fa-times"></i>
              </button>
            </div>
            
            <button
              type="button"
              onClick={handleSubmit}
              disabled={isLoading}
              className="gold-button font-montserrat text-sm font-medium px-8 py-3 rounded-full"
            >
              {isLoading ? 'GENERATING OUTFITS...' : 'GENERATE OUTFITS'}
            </button>
          </div>
        ) : (
          <div className="text-center">
            <div className="mb-4">
              <i className="fas fa-cloud-upload-alt text-4xl text-amber-deep"></i>
            </div>
            <h3 className="font-playfair text-xl mb-2 gold-text">Upload a Garment</h3>
            <p className="font-cormorant mb-6">
              Drag & drop an image of your garment, or click to browse
            </p>
            
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="gold-button font-montserrat text-sm font-medium px-8 py-3 rounded-full"
            >
              SELECT IMAGE
            </button>
            
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
            />
            
            <p className="mt-4 font-cormorant text-sm opacity-70">
              Supported formats: JPG, PNG, WEBP
            </p>
          </div>
        )}
      </GoldBorder>
    </div>
  );
};

export default ImageUploader;