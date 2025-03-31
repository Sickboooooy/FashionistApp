import React from 'react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';

interface PdfExporterProps {
  magazineContent: import('./magazine-preview').MagazineContentType;
  isGenerating: boolean;
  showWatermark: boolean;
}

const PdfExporter: React.FC<PdfExporterProps> = ({
  magazineContent,
  isGenerating,
  showWatermark
}) => {
  const { toast } = useToast();

  const exportToPDF = () => {
    // This would be replaced with actual PDF generation logic
    toast({
      title: "Exportando PDF",
      description: "Tu revista se está generando y descargará automáticamente",
    });
    
    // Simulate PDF generation with a timeout
    setTimeout(() => {
      toast({
        title: "PDF generado",
        description: showWatermark 
          ? "Tu PDF ha sido generado con marca de agua. Actualiza a premium para eliminarla." 
          : "Tu PDF ha sido generado exitosamente.",
      });
    }, 2000);
  };

  return (
    <Button 
      className="gold-button"
      onClick={exportToPDF}
      disabled={isGenerating || !magazineContent}
    >
      Exportar PDF
    </Button>
  );
};

export default PdfExporter;