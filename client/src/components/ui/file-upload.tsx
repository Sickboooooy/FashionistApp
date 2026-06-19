import { FC, useRef, useState } from 'react';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

interface FileUploadProps {
  onFileSelected: (file: File) => void;
  label?: string;
  icon?: JSX.Element;
  description?: string;
  accept?: string;
  className?: string;
  isLoading?: boolean;
}

const FileUpload: FC<FileUploadProps> = ({
  onFileSelected,
  label = 'Upload File',
  icon,
  description,
  accept = 'image/*',
  className,
  isLoading = false,
}) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      validateAndProcessFile(file);
    }
  };

  const validateAndProcessFile = (file: File) => {
    // Check if file is an image
    if (!file.type.startsWith('image/')) {
      toast({
        title: 'Invalid file type',
        description: 'Please upload an image file',
        variant: 'destructive',
      });
      return;
    }

    // Check file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: 'File too large',
        description: 'Image size should be less than 5MB',
        variant: 'destructive',
      });
      return;
    }

    onFileSelected(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    
    const file = e.dataTransfer.files?.[0];
    if (file) {
      validateAndProcessFile(file);
    }
  };

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div
      className={cn(
        'glass-card p-6 h-48 flex flex-col items-center justify-center text-center group cursor-pointer',
        isDragOver && 'border-amber-500/50 bg-amber-500/5',
        isLoading && 'opacity-70 cursor-wait',
        className
      )}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={isLoading ? undefined : handleClick}
    >
      {isLoading ? (
        <div className="animate-pulse flex flex-col items-center">
          <div className="w-8 h-8 border-2 border-t-amber-500 border-r-transparent border-b-transparent border-l-transparent rounded-full animate-spin mb-4"></div>
          <p className="text-amber-400/80 font-light text-sm">Procesando...</p>
        </div>
      ) : (
        <>
          {icon && (
            <div className="text-3xl mb-4 text-amber-500/60 group-hover:text-amber-400 transition-colors">
              {icon}
            </div>
          )}
          <h3 className="font-serif text-lg mb-2 text-stone-100">{label}</h3>
          {description && (
            <p className="text-sm text-stone-400 font-light mb-4">{description}</p>
          )}
        </>
      )}
      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        accept={accept}
        onChange={handleFileChange}
        disabled={isLoading}
      />
    </div>
  );
};

export default FileUpload;
