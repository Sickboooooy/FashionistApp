
import { useState, useEffect } from 'react';
import GoldBorder from './ui/gold-border';
import GoldText from './ui/gold-text';
import { Button } from './ui/button';
import { Skeleton } from './ui/skeleton';
import { Badge } from './ui/badge';

interface ProductSuggestionsProps {
  searchTerm?: string;
  category?: string;
  occasion?: string;
}

interface Product {
  id: number;
  name: string;
  description: string;
  imageUrl: string;
  price: string;
  store: string;
  storeUrl: string;
  rating: number;
  discount?: string;
}

const ProductSuggestions = ({ searchTerm = '', category = 'all', occasion = '' }: ProductSuggestionsProps) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedFilters, setSelectedFilters] = useState<string[]>([]);
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 500]);
  
  // Filtros disponibles
  const availableFilters = [
    'Mejor valorados', 'Envío gratis', 'Descuentos', 
    'Ecológico', 'Edición limitada', 'Novedad'
  ];

  // Simular carga de productos
  useEffect(() => {
    setIsLoading(true);
    setError(null);
    
    // En una aplicación real, aquí haríamos la llamada a la API
    setTimeout(() => {
      try {
        // Generar productos de demostración basados en la búsqueda
        const demoProducts: Product[] = Array(12).fill(0).map((_, index) => {
          const terms = searchTerm.split(' ');
          const term = terms[Math.floor(Math.random() * terms.length)] || 'fashion';
          
          const stores = ['Zara', 'H&M', 'Mango', 'Pull & Bear', 'El Corte Inglés', 'Amazon Fashion'];
          const store = stores[Math.floor(Math.random() * stores.length)];
          
          const price = Math.floor(Math.random() * 200) + 20;
          const hasDiscount = Math.random() > 0.7;
          const discountPercentage = hasDiscount ? Math.floor(Math.random() * 40) + 10 : undefined;
          
          return {
            id: index + 1,
            name: `${term.charAt(0).toUpperCase() + term.slice(1)} ${['Premium', 'Classic', 'Modern', 'Essential', 'Elegant'][Math.floor(Math.random() * 5)]}`,
            description: `${occasion ? occasion + ' ' : ''}${category !== 'all' ? category + ' ' : ''}para ${Math.random() > 0.5 ? 'hombre' : 'mujer'}`,
            imageUrl: `https://source.unsplash.com/random/300x400/?fashion,${term},${category !== 'all' ? category : ''}`,
            price: `${price}€`,
            store,
            storeUrl: '#',
            rating: Math.random() * 2 + 3, // Rating entre 3 y 5
            discount: hasDiscount ? `-${discountPercentage}%` : undefined
          };
        });
        
        setProducts(demoProducts);
        setIsLoading(false);
      } catch (err) {
        setError('Error cargando productos. Intenta de nuevo más tarde.');
        setIsLoading(false);
      }
    }, 1500);
  }, [searchTerm, category, occasion]);
  
  const toggleFilter = (filter: string) => {
    if (selectedFilters.includes(filter)) {
      setSelectedFilters(selectedFilters.filter(f => f !== filter));
    } else {
      setSelectedFilters([...selectedFilters, filter]);
    }
  };
  
  const handlePriceChange = (e: React.ChangeEvent<HTMLInputElement>, index: number) => {
    const newValue = parseInt(e.target.value);
    const newRange = [...priceRange] as [number, number];
    newRange[index] = newValue;
    setPriceRange(newRange);
  };

  return (
    <div className="container mx-auto max-w-6xl">
      <div className="text-center mb-8">
        <h2 className="font-playfair text-2xl md:text-3xl mb-2">
          <GoldText>Productos</GoldText> Similares
        </h2>
        <p className="font-cormorant text-center text-lg mb-4 opacity-80 max-w-2xl mx-auto">
          Descubre productos que coinciden con tu estilo y necesidades
        </p>
        
        {searchTerm && (
          <p className="font-montserrat text-sm text-amber-deep/80">
            Mostrando resultados para: <span className="text-amber-deep">{searchTerm}</span>
            {category !== 'all' && <span> en <span className="text-amber-deep">{category}</span></span>}
            {occasion && <span> para <span className="text-amber-deep">{occasion}</span></span>}
          </p>
        )}
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 mb-10">
        {/* Filtros */}
        <div className="lg:col-span-1">
          <GoldBorder className="p-5">
            <h3 className="font-playfair text-lg gold-text mb-4">Filtros</h3>
            
            {/* Rango de precio */}
            <div className="mb-6">
              <h4 className="text-sm uppercase tracking-wider text-amber-deep mb-3">Precio</h4>
              <div className="flex justify-between mb-2">
                <span className="text-sm">{priceRange[0]}€</span>
                <span className="text-sm">{priceRange[1]}€</span>
              </div>
              <div className="relative h-1 bg-black rounded-full gold-border mb-6">
                <div 
                  className="absolute bg-gradient-to-r from-gold-light to-gold-dark h-full rounded-full"
                  style={{ 
                    left: `${(priceRange[0] / 500) * 100}%`, 
                    width: `${((priceRange[1] - priceRange[0]) / 500) * 100}%` 
                  }}
                ></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-amber-deep/80 mb-1 block">Mínimo</label>
                  <input 
                    type="range" 
                    min="0" 
                    max="500" 
                    value={priceRange[0]} 
                    onChange={(e) => handlePriceChange(e, 0)}
                    className="w-full"
                  />
                </div>
                <div>
                  <label className="text-xs text-amber-deep/80 mb-1 block">Máximo</label>
                  <input 
                    type="range" 
                    min="0" 
                    max="500" 
                    value={priceRange[1]} 
                    onChange={(e) => handlePriceChange(e, 1)}
                    className="w-full"
                  />
                </div>
              </div>
            </div>
            
            {/* Opciones de filtrado */}
            <div className="space-y-4">
              <h4 className="text-sm uppercase tracking-wider text-amber-deep mb-2">Características</h4>
              {availableFilters.map((filter) => (
                <div key={filter} className="flex items-center">
                  <div 
                    className={`w-5 h-5 rounded border cursor-pointer mr-3 flex items-center justify-center ${
                      selectedFilters.includes(filter) 
                        ? 'bg-amber-deep border-amber-deep' 
                        : 'border-amber-deep/40 bg-black'
                    }`}
                    onClick={() => toggleFilter(filter)}
                  >
                    {selectedFilters.includes(filter) && (
                      <i className="fas fa-check text-xs text-black"></i>
                    )}
                  </div>
                  <label 
                    className="font-cormorant cursor-pointer" 
                    onClick={() => toggleFilter(filter)}
                  >
                    {filter}
                  </label>
                </div>
              ))}
            </div>
            
            <div className="mt-6">
              <Button className="w-full bg-amber-deep hover:bg-amber-deep/80 text-black">
                Aplicar Filtros
              </Button>
            </div>
          </GoldBorder>
        </div>
        
        {/* Lista de productos */}
        <div className="lg:col-span-3">
          {isLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {Array(6).fill(0).map((_, index) => (
                <div key={index} className="border border-amber-deep/20 rounded-lg overflow-hidden">
                  <Skeleton className="w-full aspect-[3/4] bg-amber-deep/5" />
                  <div className="p-4">
                    <Skeleton className="w-3/4 h-5 mb-2 bg-amber-deep/5" />
                    <Skeleton className="w-1/2 h-4 mb-3 bg-amber-deep/5" />
                    <div className="flex justify-between">
                      <Skeleton className="w-1/4 h-4 bg-amber-deep/5" />
                      <Skeleton className="w-1/4 h-4 bg-amber-deep/5" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : error ? (
            <div className="text-center py-12">
              <p className="text-lg text-red-500">{error}</p>
              <Button 
                variant="outline" 
                className="mt-4 border-amber-deep text-amber-deep"
                onClick={() => setIsLoading(true)}
              >
                Intentar de nuevo
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {products.map((product) => (
                <a 
                  key={product.id} 
                  href={product.storeUrl}
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="block group"
                >
                  <GoldBorder 
                    className="overflow-hidden transition-all hover:shadow-lg"
                    hover
                  >
                    <div className="relative">
                      {product.discount && (
                        <div className="absolute top-3 right-3 z-10">
                          <Badge className="bg-red-600 text-white font-medium">
                            {product.discount}
                          </Badge>
                        </div>
                      )}
                      <div className="aspect-[3/4] overflow-hidden bg-black-elegant">
                        <img 
                          src={product.imageUrl} 
                          alt={product.name} 
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      </div>
                      <div className="p-4">
                        <h3 className="font-playfair text-lg gold-text truncate">{product.name}</h3>
                        <p className="font-cormorant text-cream-soft/70 text-sm mb-3 truncate">
                          {product.description}
                        </p>
                        <div className="flex justify-between items-center">
                          <div>
                            <span className="font-montserrat text-amber-deep font-medium">
                              {product.price}
                            </span>
                            {product.discount && (
                              <span className="font-montserrat text-cream-soft/50 text-sm ml-2 line-through">
                                {Math.round(parseInt(product.price) / (1 - parseInt(product.discount) / 100))}€
                              </span>
                            )}
                          </div>
                          <span className="font-cormorant text-cream-soft/70 text-sm">
                            {product.store}
                          </span>
                        </div>
                        
                        <div className="flex items-center mt-3">
                          <div className="flex mr-2">
                            {Array(5).fill(0).map((_, i) => (
                              <i 
                                key={i} 
                                className={`text-xs ${
                                  i < Math.floor(product.rating) 
                                    ? 'fas fa-star text-amber-deep' 
                                    : i < product.rating 
                                      ? 'fas fa-star-half-alt text-amber-deep' 
                                      : 'far fa-star text-amber-deep/30'
                                }`}
                              ></i>
                            ))}
                          </div>
                          <span className="text-xs text-cream-soft/50">
                            ({(Math.random() * 100 + 10).toFixed(0)})
                          </span>
                        </div>
                      </div>
                    </div>
                  </GoldBorder>
                </a>
              ))}
            </div>
          )}
          
          {!isLoading && !error && (
            <div className="flex justify-center mt-8">
              <Button 
                variant="outline" 
                className="border-amber-deep text-amber-deep hover:bg-amber-deep/10"
              >
                Cargar Más Productos
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProductSuggestions;
