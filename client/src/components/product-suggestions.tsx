import { useState, useEffect } from 'react';
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
    <div className="mt-20 mb-10">
      <div className="flex flex-col md:flex-row justify-between items-center mb-8">
        <h3 className="font-playfair text-2xl mb-3 md:mb-0">
          <GoldText>Encuentra</GoldText> Piezas Similares
        </h3>
        <Link href="/product-search">
          <Button variant="outline" size="sm" className="border-amber-deep/40 hover:border-amber-deep text-amber-deep hover:bg-amber-deep/5">
            <i className="fas fa-search mr-2 text-xs"></i>
            Ver más productos
          </Button>
        </Link>
      </div>

      <Tabs defaultValue={outfits[0].id.toString()}>
        <TabsList className="bg-black border border-amber-deep/30 mb-8 p-1 rounded-full w-auto mx-auto flex justify-center">
          {outfits.map((outfit) => (
            <TabsTrigger 
              key={outfit.id} 
              value={outfit.id.toString()}
              className="data-[state=active]:bg-amber-deep data-[state=active]:text-black rounded-full px-6 py-1.5 text-xs tracking-wide"
            >
              {outfit.name.split(' ')[0]}
            </TabsTrigger>
          ))}
        </TabsList>

        {outfits.map((outfit) => (
          <TabsContent key={outfit.id} value={outfit.id.toString()}>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {mockProducts.map((product) => (
                <GoldBorder key={product.id} className="overflow-hidden bg-black group hover:shadow-[0_0_15px_rgba(255,215,0,0.15)] transition-all duration-300">
                  <div className="aspect-square overflow-hidden relative">
                    <img 
                      src={product.imageUrl} 
                      alt={product.name} 
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="absolute bottom-3 left-3 text-xs bg-black/80 border-amber-deep/50 text-amber-deep hover:bg-amber-deep hover:text-black opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-y-2 group-hover:translate-y-0"
                    >
                      <i className="fas fa-shopping-bag mr-2"></i>
                      Ver producto
                    </Button>
                  </div>
                  <div className="p-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-playfair text-sm text-amber-300">{product.name}</h4>
                        <p className="text-xs opacity-70 mt-1">{product.store}</p>
                      </div>
                      <span className="font-montserrat text-xs bg-amber-deep/10 px-2 py-1 rounded text-amber-deep">{product.price}</span>
                    </div>
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