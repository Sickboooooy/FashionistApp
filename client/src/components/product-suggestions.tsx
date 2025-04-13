import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import GoldBorder from './ui/gold-border';
import GoldText from './ui/gold-text';
import { Outfit } from '@/contexts/outfit-context';
import { Link } from 'wouter';

interface ProductSuggestionsProps {
  outfits: Outfit[];
}

interface Product {
  id: string;
  name: string;
  price: string;
  store: string;
  imageUrl: string;
  url: string;
}

const ProductSuggestions = ({ outfits }: ProductSuggestionsProps) => {
  const [selectedOutfit, setSelectedOutfit] = useState<number | null>(
    outfits.length > 0 ? outfits[0].id : null
  );
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [products, setProducts] = useState<Product[]>([]);

  // Simulated products con fallback
  const mockProducts: Product[] = [
    {
      id: '1',
      name: 'Blazer Minimalista',
      price: '89,90€',
      store: 'Zara',
      imageUrl: 'https://images.unsplash.com/photo-1591047139829-d91aecb6caea?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.0.3',
      url: '#'
    },
    {
      id: '2',
      name: 'Vestido Elegante',
      price: '129,00€',
      store: 'Mango',
      imageUrl: 'https://images.unsplash.com/photo-1595777457583-95e059d581b8?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.0.3',
      url: '#'
    },
    {
      id: '3',
      name: 'Pantalón Clásico',
      price: '69,95€',
      store: 'H&M',
      imageUrl: 'https://images.unsplash.com/photo-1594633312681-425c7b97ccd1?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.0.3',
      url: '#'
    },
  ];
  
  // Efecto para simular carga de productos desde API
  useEffect(() => {
    const loadProducts = async () => {
      if (outfits.length === 0) return;
      
      setIsLoading(true);
      setError(null);
      
      try {
        // Simulamos la carga de datos con un retraso
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // En una aplicación real, aquí harías la llamada a la API
        // const response = await fetch(`/api/products/suggestions?outfitId=${outfits[0].id}`);
        // const data = await response.json();
        // setProducts(data);
        
        // Por ahora, usamos los datos simulados
        setProducts(mockProducts);
      } catch (err) {
        console.error("Error al cargar productos sugeridos:", err);
        setError("No pudimos cargar los productos sugeridos");
      } finally {
        setIsLoading(false);
      }
    };
    
    loadProducts();
  }, [outfits]);

  if (outfits.length === 0) return null;

  return (
    <div className="mt-16 mb-10">
      <div className="flex justify-between items-center mb-6">
        <h3 className="font-playfair text-xl">
          <GoldText>Encuentra</GoldText> Piezas Similares
        </h3>
        <Link href="/product-search">
          <Button variant="link" className="text-amber-deep">
            Ver más productos
          </Button>
        </Link>
      </div>

      <Tabs defaultValue={outfits[0].id.toString()}>
        <TabsList className="bg-black-elegant border border-amber-deep/30 mb-6">
          {outfits.map((outfit) => (
            <TabsTrigger 
              key={outfit.id} 
              value={outfit.id.toString()}
              className="data-[state=active]:bg-amber-deep/10 data-[state=active]:text-amber-deep"
            >
              {outfit.name.split(' ')[0]}
            </TabsTrigger>
          ))}
        </TabsList>

        {outfits.map((outfit) => (
          <TabsContent key={outfit.id} value={outfit.id.toString()}>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {mockProducts.map((product) => (
                <GoldBorder key={product.id} className="overflow-hidden bg-black">
                  <div className="aspect-square overflow-hidden">
                    <img 
                      src={product.imageUrl} 
                      alt={product.name} 
                      className="w-full h-full object-cover hover:scale-105 transition-transform duration-500"
                    />
                  </div>
                  <div className="p-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-playfair text-sm text-amber-300">{product.name}</h4>
                        <p className="text-xs opacity-70">{product.store}</p>
                      </div>
                      <span className="font-montserrat text-xs text-amber-deep">{product.price}</span>
                    </div>
                    <Button variant="link" size="sm" className="text-xs p-0 h-auto mt-2 text-amber-deep">
                      Ver producto
                    </Button>
                  </div>
                </GoldBorder>
              ))}
            </div>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
};

export default ProductSuggestions;