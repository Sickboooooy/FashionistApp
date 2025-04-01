import { useState } from 'react';
import FileUpload from './ui/file-upload';
import GoldBorder from './ui/gold-border';
import { useOutfit } from '../contexts/outfit-context';
import { useToast } from '@/hooks/use-toast';

const InputMethods = () => {
  const [isUploading, setIsUploading] = useState(false);
  const { openTextModal, uploadImage, isLoading } = useOutfit();
  const { toast } = useToast();

  const handleFileUpload = async (file: File) => {
    if (!file) return;
    
    setIsUploading(true);
    try {
      // Usar la función de uploadImage del contexto
      await uploadImage(file);
      
      // No need for additional toast since uploadImage already includes them
    } catch (error) {
      // Error handling is already done in the uploadImage function
      console.error("Error handling file upload:", error);
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
          label="Subir Prenda"
          description="Crea conjuntos con tu ropa"
          icon={<i className="fas fa-tshirt"></i>}
          isLoading={isUploading || isLoading}
        />
      </div>
      
      {/* Text Input Button */}
      <div className="flex-1 max-w-xs mx-auto md:mx-0">
        <GoldBorder
          className="p-6 hover:spotlight transition-all cursor-pointer h-48 flex flex-col items-center justify-center text-center group"
          onClick={openTextModal}
        >
          <i className="fas fa-keyboard text-3xl mb-4 text-amber-deep group-hover:gold-text transition-colors"></i>
          <h3 className="font-playfair text-lg mb-2 gold-text">Describe tus Necesidades</h3>
          <p className="font-cormorant text-sm opacity-80 mb-4">Cuéntanos qué estás buscando</p>
        </GoldBorder>
      </div>
    </div>
  );
};

export default InputMethods;
