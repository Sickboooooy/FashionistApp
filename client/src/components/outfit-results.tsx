import { useOutfit } from '../contexts/outfit-context';
import { cn } from '@/lib/utils';
import GoldBorder from './ui/gold-border';
import type { Outfit } from '../contexts/outfit-context';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';

const OutfitItem = ({ outfit }: { outfit: Outfit }) => {
  const { saveOutfit } = useOutfit();
  const [showSimilarProducts, setShowSimilarProducts] = useState(false);
  const [similarProducts, setSimilarProducts] = useState<Array<{name: string, image: string, price: string, store: string, url: string}>>([]);
  const [isLoading, setIsLoading] = useState(false);
  
  // Función para buscar productos similares
  const findSimilarProducts = async (piece: string) => {
    setIsLoading(true);
    try {
      // En un caso real, aquí haríamos una llamada a la API
      // Simulamos productos para demostración
      setTimeout(() => {
        const mockProducts = [
          {
            name: piece,
            image: `https://source.unsplash.com/random/300x400/?fashion,${piece.split(' ')[0]}`,
            price: `${Math.floor(Math.random() * 150) + 50}€`,
            store: ['Zara', 'H&M', 'Mango', 'Massimo Dutti'][Math.floor(Math.random() * 4)],
            url: '#'
          },
          {
            name: `${piece} premium`,
            image: `https://source.unsplash.com/random/300x400/?fashion,${piece.split(' ')[0]},premium`,
            price: `${Math.floor(Math.random() * 200) + 120}€`,
            store: ['El Corte Inglés', 'Ralph Lauren', 'Calvin Klein', 'Lacoste'][Math.floor(Math.random() * 4)],
            url: '#'
          },
          {
            name: `${piece} casual`,
            image: `https://source.unsplash.com/random/300x400/?fashion,${piece.split(' ')[0]},casual`,
            price: `${Math.floor(Math.random() * 80) + 30}€`,
            store: ['Pull & Bear', 'Bershka', 'Stradivarius', 'Springfield'][Math.floor(Math.random() * 4)],
            url: '#'
          }
        ];
        setSimilarProducts(mockProducts);
        setIsLoading(false);
      }, 1500);
    } catch (error) {
      console.error("Error buscando productos similares:", error);
      setIsLoading(false);
    }
  };
  
  return (
    <GoldBorder 
      className="overflow-hidden transition-all hover:shadow-2xl"
      hover
    >
      <div className="p-6">
        <h3 className="font-playfair text-xl font-semibold gold-text mb-2">
          {outfit.name}
        </h3>
        
        <div className="flex flex-wrap gap-2 mb-4">
          <Badge className="bg-gold-light text-black font-medium">{outfit.occasion}</Badge>
          {outfit.season && (
            <Badge variant="outline" className="border-gold-light text-gold-light font-medium">
              {outfit.season}
            </Badge>
          )}
        </div>
        
        <p className="font-cormorant text-cream-soft mb-6">
          {outfit.description}
        </p>
        
        {outfit.pieces && outfit.pieces.length > 0 && (
          <>
            <Separator className="my-4 bg-amber-deep/30" />
            <div className="mt-4">
              <h4 className="text-sm uppercase tracking-wider text-amber-deep mb-2">Prendas</h4>
              <ul className="font-cormorant text-cream-soft space-y-3">
                {outfit.pieces.map((piece, idx) => (
                  <li key={idx} className="flex items-center justify-between">
                    <span className="list-item">{piece}</span>
                    <Button 
                      size="sm"
                      variant="ghost" 
                      className="text-amber-deep hover:text-amber-deep/80 hover:bg-amber-deep/10"
                      onClick={() => {
                        findSimilarProducts(piece);
                        setShowSimilarProducts(true);
                      }}
                    >
                      <span className="mr-1">Buscar</span>
                      <i className="fas fa-search text-xs"></i>
                    </Button>
                  </li>
                ))}
              </ul>
            </div>
          </>
        )}
        
        {showSimilarProducts && (
          <div className="mt-6 border border-amber-deep/30 rounded-md p-4">
            <div className="flex justify-between items-center mb-4">
              <h4 className="text-sm uppercase tracking-wider text-amber-deep">Productos Similares</h4>
              <Button 
                size="sm"
                variant="ghost" 
                className="text-amber-deep hover:bg-amber-deep/10"
                onClick={() => setShowSimilarProducts(false)}
              >
                <i className="fas fa-times"></i>
              </Button>
            </div>
            
            {isLoading ? (
              <div className="flex justify-center p-4">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-amber-deep"></div>
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-3">
                {similarProducts.map((product, idx) => (
                  <a 
                    key={idx} 
                    href={product.url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="block border border-amber-deep/20 rounded-md overflow-hidden hover:border-amber-deep transition-all"
                  >
                    <div className="aspect-[3/4] bg-black-elegant overflow-hidden">
                      <img 
                        src={product.image} 
                        alt={product.name} 
                        className="w-full h-full object-cover hover:scale-105 transition-transform"
                      />
                    </div>
                    <div className="p-2">
                      <p className="font-cormorant text-sm text-cream-soft truncate">{product.name}</p>
                      <div className="flex justify-between items-center mt-1">
                        <span className="text-xs font-montserrat text-gold-light">{product.price}</span>
                        <span className="text-xs font-montserrat text-cream-soft/70">{product.store}</span>
                      </div>
                    </div>
                  </a>
                ))}
              </div>
            )}
          </div>
        )}
        
        {outfit.reasoning && (
          <div className="mt-4 border-t border-amber-deep/30 pt-4">
            <h4 className="text-sm uppercase tracking-wider text-amber-deep mb-2">Notas de Estilo</h4>
            <p className="font-cormorant italic text-cream-soft/90">
              {outfit.reasoning}
            </p>
          </div>
        )}
        
        <div className="mt-6 flex justify-between">
          <Button 
            onClick={() => setShowSimilarProducts(!showSimilarProducts)}
            variant="outline"
            className="border-amber-deep text-amber-deep hover:bg-amber-deep/10"
          >
            {showSimilarProducts ? 'Ocultar Productos' : 'Ver Productos Similares'}
          </Button>
          <Button 
            onClick={() => saveOutfit(outfit)}
            variant="outline"
            className="border-gold-light text-gold-light hover:bg-amber-deep/10"
          >
            Guardar en Mi Colección
          </Button>
        </div>
      </div>
    </GoldBorder>
  );
};

const LoadingState = () => (
  <div className="w-full max-w-3xl mx-auto mt-12 px-4">
    <h2 className="font-playfair text-2xl text-center gold-text mb-8">
      Generando tus Conjuntos
    </h2>
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {[1, 2, 3].map((i) => (
        <div key={i} className="bg-black border border-amber-deep/20 rounded-lg p-6 animate-pulse">
          <div className="h-6 bg-amber-deep/10 rounded mb-4 w-3/4"></div>
          <div className="flex gap-2 mb-4">
            <div className="h-6 bg-amber-deep/10 rounded w-20"></div>
            <div className="h-6 bg-amber-deep/10 rounded w-16"></div>
          </div>
          <div className="space-y-2">
            <div className="h-4 bg-amber-deep/10 rounded w-full"></div>
            <div className="h-4 bg-amber-deep/10 rounded w-full"></div>
            <div className="h-4 bg-amber-deep/10 rounded w-5/6"></div>
            <div className="h-4 bg-amber-deep/10 rounded w-4/6"></div>
          </div>
          <div className="h-10 bg-amber-deep/10 rounded mt-6 w-1/2 ml-auto"></div>
        </div>
      ))}
    </div>
  </div>
);

const ErrorState = ({ error }: { error: string }) => (
  <div className="w-full max-w-xl mx-auto mt-12 px-4">
    <GoldBorder className="p-6 bg-black-elegant">
      <h2 className="font-playfair text-xl gold-text mb-4">Error al Generar Conjuntos</h2>
      <p className="font-cormorant text-cream-soft mb-6">
        {error || "Hubo un error al procesar tu solicitud. Por favor, intenta de nuevo."}
      </p>
      <p className="font-cormorant text-cream-soft/80 italic text-sm mb-4">
        Posibles soluciones:
      </p>
      <ul className="list-disc pl-5 font-cormorant text-cream-soft/80 space-y-1 text-sm">
        <li>Intenta subir una imagen diferente</li>
        <li>Asegúrate de que la imagen muestre claramente una prenda</li>
        <li>Comprueba tu conexión a internet</li>
      </ul>
    </GoldBorder>
  </div>
);

const OutfitResults = () => {
  const { generatedOutfits, isLoading, error } = useOutfit();

  if (isLoading) {
    return <LoadingState />;
  }

  if (error) {
    return <ErrorState error={error} />;
  }

  if (generatedOutfits.length === 0) {
    return null;
  }

  return (
    <div className="w-full max-w-7xl mx-auto mt-12 px-4">
      <h2 className="font-playfair text-3xl text-center gold-text mb-2">
        Tus Looks Seleccionados
      </h2>
      <p className="font-cormorant text-center text-cream-soft/80 mb-10 max-w-2xl mx-auto">
        El estilista de IA de Selene ha creado estas sugerencias de conjuntos basadas en tu prenda.
        Cada look ha sido elegantemente diseñado para adaptarse a tus preferencias de estilo.
      </p>
      
      <div 
        className={cn(
          "grid gap-8",
          generatedOutfits.length === 1 ? "grid-cols-1 max-w-xl mx-auto" :
          generatedOutfits.length === 2 ? "grid-cols-1 md:grid-cols-2" :
          "grid-cols-1 md:grid-cols-2 lg:grid-cols-3"
        )}
      >
        {generatedOutfits.map((outfit) => (
          <OutfitItem key={outfit.id} outfit={outfit} />
        ))}
      </div>
    </div>
  );
};

export default OutfitResults;