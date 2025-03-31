import { useState } from 'react';
import FileUpload from './ui/file-upload';
import GoldBorder from './ui/gold-border';
import { useOutfit } from '../contexts/outfit-context';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';

const InputMethods = () => {
  const [isUploading, setIsUploading] = useState(false);
  const { openTextModal } = useOutfit();
  const { toast } = useToast();

  const handleFileUpload = async (file: File) => {
    setIsUploading(true);
    
    try {
      // Create form data for file upload
      const formData = new FormData();
      formData.append('image', file);
      
      // Call API to analyze the garment image
      const response = await fetch('/api/analyze-garment', {
        method: 'POST',
        body: formData,
      });
      
      if (!response.ok) {
        throw new Error('Failed to analyze image');
      }
      
      const garmentData = await response.json();
      
      // Show success toast
      toast({
        title: 'Image Analyzed Successfully',
        description: `Detected: ${garmentData.name || 'Garment'}`,
      });
      
      // Generate outfit suggestions based on the garment
      // This would call another endpoint with the garment data
      // For now, we'll just show a toast
      toast({
        title: 'Generating outfit suggestions',
        description: 'Your personalized outfits will be ready soon',
      });
      
    } catch (error) {
      toast({
        title: 'Error analyzing image',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="flex flex-col space-y-6 md:space-y-0 md:flex-row md:space-x-6 justify-center mb-12">
      {/* Image Upload Button */}
      <div className="flex-1 max-w-xs mx-auto md:mx-0">
        <FileUpload
          onFileSelected={handleFileUpload}
          label="Upload Garment"
          description="Create outfits with your clothes"
          icon={<i className="fas fa-tshirt"></i>}
          className={isUploading ? 'opacity-70 pointer-events-none' : ''}
        />
      </div>
      
      {/* Text Input Button */}
      <div className="flex-1 max-w-xs mx-auto md:mx-0">
        <GoldBorder
          className="p-6 hover:spotlight transition-all cursor-pointer h-48 flex flex-col items-center justify-center text-center group"
          onClick={openTextModal}
        >
          <i className="fas fa-keyboard text-3xl mb-4 text-amber-deep group-hover:gold-text transition-colors"></i>
          <h3 className="font-playfair text-lg mb-2 gold-text">Describe Your Need</h3>
          <p className="font-cormorant text-sm opacity-80 mb-4">Tell us what you're looking for</p>
        </GoldBorder>
      </div>
    </div>
  );
};

export default InputMethods;
