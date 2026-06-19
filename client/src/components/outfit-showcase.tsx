import { useOutfit } from '../contexts/outfit-context';
import ImageUploader from './image-uploader';
import OutfitResults from './outfit-results';
import OutfitCard from './outfit-card';
import { Button } from '@/components/ui/button';
import { Link } from 'wouter';

// Example outfits to show when no outfits have been generated
const SAMPLE_OUTFITS = [
  {
    id: 1,
    name: 'Elegancia Ejecutiva',
    description: 'Un conjunto sofisticado para reuniones corporativas, con blazer estructurado, pantalones a medida y accesorios que completan el look.',
    occasion: 'FORMAL',
    imageUrl: 'https://images.unsplash.com/photo-1581044777550-4cfa60707c03?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&h=600&q=80',
  },
  {
    id: 2,
    name: 'Sofisticación de Fin de Semana',
    description: 'Un estilo relajado y refinado con denim premium, blusa de seda y accesorios artesanales ideal para encuentros de fin de semana.',
    occasion: 'CASUAL CHIC',
    imageUrl: 'https://images.unsplash.com/photo-1509631179647-0177331693ae?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&h=600&q=80',
  },
  {
    id: 3,
    name: 'Glamour de Gala',
    description: 'Un outfit impactante para eventos nocturnos, con silueta estructurada y detalles artesanales exclusivos de Anna.',
    occasion: 'NOCTURNO',
    imageUrl: 'https://images.unsplash.com/photo-1485968579580-b6d095142e6e?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&h=600&q=80',
  },
];

const OutfitShowcase = () => {
  const { generatedOutfits, savedOutfits, isLoading } = useOutfit();
  
  // Determine which outfits to show
  const showSampleOutfits = !isLoading && generatedOutfits.length === 0;
  
  return (
    <section id="outfit-showcase" className="section-editorial">
      <div className="container mx-auto">
        {/* Main Outfit Generation Section */}
        <div className="mb-16">
          <span className="section-label">Personalizado con IA</span>
          <h2 className="section-title">
            Crea tu <span className="italic text-amber-500">outfit</span> perfecto
          </h2>
          <p className="section-desc">
            Sube una imagen de tu prenda y nuestra estilista con IA generará combinaciones personalizadas
          </p>
          
          {/* Image Uploader */}
          <div className="max-w-md mx-auto mb-8">
            <ImageUploader />
          </div>
          
          {/* Generated Outfit Results */}
          <OutfitResults />
        </div>
        
        {/* Sample Outfits or Saved Collections */}
        {showSampleOutfits && (
          <div>
            <span className="section-label">Curado por Anna</span>
            <h3 className="section-title text-2xl md:text-3xl">
              <span className="italic text-amber-500">Inspiraciones</span> seleccionadas
            </h3>
            <p className="section-desc">
              Explora estas propuestas o crea tus propios outfits personalizados arriba
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {SAMPLE_OUTFITS.map((outfit) => (
                <OutfitCard key={outfit.id} outfit={outfit} />
              ))}
            </div>
          </div>
        )}
        
        {/* Saved Outfits Section (if any) */}
        {savedOutfits.length > 0 && (
          <div className="mt-20">
            <span className="section-label">Tu guardarropa</span>
            <h3 className="section-title text-2xl md:text-3xl">
              Colección <span className="italic text-amber-500">guardada</span>
            </h3>
            <p className="section-desc mb-6">
              Conjuntos que has guardado para consultarlos más adelante
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {savedOutfits.slice(0, 3).map((outfit) => (
                <OutfitCard key={outfit.id} outfit={outfit} />
              ))}
            </div>
            
            {savedOutfits.length > 3 && (
              <div className="text-center mt-8">
                <Link href="/my-closet">
                  <Button 
                    variant="outline" 
                    className="rounded-full border-amber-500/50 bg-amber-500/5 text-amber-300 hover:bg-amber-500/15 hover:text-amber-200"
                  >
                    Ver Todos los Outfits Guardados
                  </Button>
                </Link>
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
};

export default OutfitShowcase;
