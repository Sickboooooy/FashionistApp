import { FC, useState } from 'react';
import { Button } from '@/components/ui/button';
import { MagazineContent } from './magazine-preview';
import { Download, Loader2 } from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';

interface PdfExporterProps {
  magazineContent: MagazineContent | null;
  isPremiumUser?: boolean;
}

const PdfExporter: FC<PdfExporterProps> = ({
  magazineContent,
  isPremiumUser = false
}) => {
  const [isExporting, setIsExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleExportPdf = async () => {
    if (!magazineContent) {
      setError('No hay contenido de revista para exportar. Por favor, genera el contenido primero.');
      return;
    }

    setIsExporting(true);
    setError(null);

    try {
      // Esta es una implementación simulada para descargar el PDF
      // En una implementación real, se procesaría el blob de respuesta
      
      const response = await fetch('/api/export-magazine-pdf', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content: magazineContent,
          isPremiumUser
        }),
      });

      if (!response.ok) {
        throw new Error('Error al generar el PDF');
      }

      // En un caso real, aquí recibiríamos un blob del servidor
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      
      // Crear un enlace temporal y simular clic para descargar
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = `${magazineContent.title.replace(/\s+/g, '_').toLowerCase()}_magazine.pdf`;
      document.body.appendChild(a);
      a.click();
      
      // Limpieza
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err: any) {
      setError(err.message || 'Ha ocurrido un error al exportar la revista a PDF.');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="w-full py-6">
      <div className="flex flex-col items-center justify-center">
        <Button
          onClick={handleExportPdf}
          disabled={isExporting || !magazineContent}
          className="gold-button w-full max-w-md flex items-center justify-center gap-2"
          size="lg"
        >
          {isExporting ? (
            <>
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              Generando PDF...
            </>
          ) : (
            <>
              <Download className="h-5 w-5" />
              Exportar a PDF
            </>
          )}
        </Button>
        
        {!isPremiumUser && (
          <p className="mt-2 text-xs text-amber-deep/70 text-center max-w-md">
            Los usuarios gratuitos recibirán su PDF con marca de agua de Anna Style.
            Actualiza a premium para exportar sin marcas de agua.
          </p>
        )}
        
        {error && (
          <div className="mt-4 p-3 bg-red-900/20 border border-red-800 rounded-md text-center max-w-md">
            <p className="text-red-400 text-sm">{error}</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default PdfExporter;