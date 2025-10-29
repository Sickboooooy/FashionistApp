import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { FiShare, FiMail, FiCopy, FiTwitter, FiInstagram, FiFacebook } from 'react-icons/fi';

interface ShareMagazineProps {
  magazineContent: any;
  disabled: boolean;
}

const ShareMagazine: React.FC<ShareMagazineProps> = ({ magazineContent, disabled }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [email, setEmail] = useState('');
  const { toast } = useToast();

  const shareUrl = "https://anna-style.com/magazine/share/123"; // Simulación de URL para compartir

  const handleShare = (platform: string) => {
    if (!magazineContent) return;

    toast({
      title: `Compartiendo en ${platform}`,
      description: "Esta función estará disponible próximamente",
    });

    // Aquí iría la implementación real para compartir en cada plataforma
    setTimeout(() => setIsOpen(false), 1000);
  };

  const handleEmailShare = () => {
    if (!email.trim()) {
      toast({
        title: "Error",
        description: "Por favor, ingresa un correo electrónico válido",
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Compartiendo por correo",
      description: `Se ha enviado un enlace a ${email}`,
    });

    setTimeout(() => {
      setIsOpen(false);
      setEmail('');
    }, 1000);
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(shareUrl).then(() => {
      toast({
        title: "Enlace copiado",
        description: "El enlace ha sido copiado al portapapeles",
      });
    }).catch(err => {
      console.error('Error al copiar:', err);
      toast({
        title: "Error",
        description: "No se pudo copiar el enlace",
        variant: "destructive",
      });
    });
  };

  return (
    <>
      <Button 
        variant="outline" 
        className="border-gold-light text-gold-light hover:bg-amber-deep/10"
        onClick={() => setIsOpen(true)}
        disabled={disabled}
      >
        <FiShare className="mr-2" />
        Compartir
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="bg-black-elegant border-amber-deep/70">
          <DialogHeader>
            <DialogTitle className="gold-text text-xl">Compartir tu revista</DialogTitle>
            <DialogDescription className="text-cream-soft/80">
              Comparte tu creación con amigos o en redes sociales
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            <div className="flex justify-between mb-6">
              <Button 
                variant="outline" 
                className="flex flex-col items-center gap-1 p-3 border-amber-deep/40 hover:bg-amber-deep/10"
                onClick={() => handleShare('Facebook')}
              >
                <FiFacebook className="h-5 w-5 text-gold-light" />
                <span className="text-xs text-cream-soft">Facebook</span>
              </Button>
              <Button 
                variant="outline" 
                className="flex flex-col items-center gap-1 p-3 border-amber-deep/40 hover:bg-amber-deep/10"
                onClick={() => handleShare('Twitter')}
              >
                <FiTwitter className="h-5 w-5 text-gold-light" />
                <span className="text-xs text-cream-soft">Twitter</span>
              </Button>
              <Button 
                variant="outline" 
                className="flex flex-col items-center gap-1 p-3 border-amber-deep/40 hover:bg-amber-deep/10"
                onClick={() => handleShare('Instagram')}
              >
                <FiInstagram className="h-5 w-5 text-gold-light" />
                <span className="text-xs text-cream-soft">Instagram</span>
              </Button>
            </div>

            <div className="space-y-4 mb-4">
              <h4 className="text-sm font-medium text-gold-light">Copiar enlace</h4>
              <div className="flex gap-2">
                <Input 
                  value={shareUrl} 
                  readOnly 
                  className="bg-black/20 border-amber-deep/30 text-cream-soft"
                />
                <Button 
                  variant="outline" 
                  className="border-amber-deep hover:bg-amber-deep/10 text-gold-light"
                  onClick={copyToClipboard}
                >
                  <FiCopy className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="space-y-4">
              <h4 className="text-sm font-medium text-gold-light">Compartir por correo</h4>
              <div className="flex gap-2">
                <Input 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Dirección de correo electrónico"
                  className="bg-black/20 border-amber-deep/30 text-cream-soft"
                />
                <Button 
                  className="gold-button"
                  onClick={handleEmailShare}
                >
                  <FiMail className="h-4 w-4 mr-2" />
                  Enviar
                </Button>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button 
              variant="outline" 
              className="border-gold-light/50 text-gold-light hover:bg-amber-deep/10"
              onClick={() => setIsOpen(false)}
            >
              Cerrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default ShareMagazine;