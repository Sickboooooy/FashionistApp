
import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import GoldBorder from '@/components/ui/gold-border';
import GoldText from '@/components/ui/gold-text';
import SpotlightContainer from '@/components/ui/spotlight-container';
import { Slider } from '@/components/ui/slider';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';

const ProductSearchPage = () => {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('all');
  const [priceRange, setPriceRange] = useState([0, 500]);
  const [stores, setStores] = useState<string[]>([]);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Simulación de productos
  const mockProducts = [
    {
      id: '1',
      name: 'Blazer Minimalista',
      price: 89.90,
      store: 'Zara',
      category: 'tops',
      color: 'negro',
      imageUrl: 'https://images.unsplash.com/photo-1591047139829-d91aecb6caea?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.0.3',
      url: '#'
    },
    {
      id: '2',
      name: 'Vestido Elegante',
      price: 129.00,
      store: 'Mango',
      category: 'dresses',
      color: 'rojo',
      imageUrl: 'https://images.unsplash.com/photo-1595777457583-95e059d581b8?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.0.3',
      url: '#'
    },
    {
      id: '3',
      name: 'Pantalón Clásico',
      price: 69.95,
      store: 'H&M',
      category: 'bottoms',
      color: 'azul',
      imageUrl: 'https://images.unsplash.com/photo-1594633312681-425c7b97ccd1?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.0.3',
      url: '#'
    },
    {
      id: '4',
      name: 'Camisa de Lino',
      price: 59.95,
      store: 'Massimo Dutti',
      category: 'tops',
      color: 'blanco',
      imageUrl: 'https://images.unsplash.com/photo-1598033129183-c4f50c736f10?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.0.3',
      url: '#'
    },
    {
      id: '5',
      name: 'Abrigo de Lana',
      price: 189.90,
      store: 'Zara',
      category: 'outerwear',
      color: 'beige',
      imageUrl: 'https://images.unsplash.com/photo-1608063615781-e2ef8c73d114?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.0.3',
      url: '#'
    },
    {
      id: '6',
      name: 'Falda Midi',
      price: 49.95,
      store: 'H&M',
      category: 'bottoms',
      color: 'negro',
      imageUrl: 'https://images.unsplash.com/photo-1583496661160-fb5886a6abb9?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.0.3',
      url: '#'
    }
  ];

  const storeOptions = [
    { id: 'zara', label: 'Zara' },
    { id: 'mango', label: 'Mango' },
    { id: 'hm', label: 'H&M' },
    { id: 'massimo', label: 'Massimo Dutti' }
  ];

  const handleSearch = () => {
    setIsLoading(true);
    
    // Guardamos los filtros en el URL para permitir compartir/recargar
    const queryParams = new URLSearchParams(window.location.search);
    if (query) queryParams.set('q', query);
    if (category !== 'all') queryParams.set('category', category);
    queryParams.set('minPrice', priceRange[0].toString());
    queryParams.set('maxPrice', priceRange[1].toString());
    if (stores.length > 0) queryParams.set('stores', stores.join(','));
    
    // Actualizamos la URL sin recargar la página
    window.history.replaceState(
      {}, 
      '', 
      `${window.location.pathname}?${queryParams.toString()}`
    );
    
    // Simulamos una búsqueda con debounce (para producción usaríamos la API real)
    const searchTimeout = setTimeout(() => {
      try {
        let results = [...mockProducts];
        
        // Filtrar por categoría si no es 'all'
        if (category !== 'all') {
          results = results.filter(product => product.category === category);
        }
        
        // Filtrar por precio
        results = results.filter(product => 
          product.price >= priceRange[0] && product.price <= priceRange[1]
        );
        
        // Filtrar por tiendas
        if (stores.length > 0) {
          results = results.filter(product => 
            stores.some(store => product.store.toLowerCase().includes(store.toLowerCase()))
          );
        }
        
        // Filtrar por texto de búsqueda con búsqueda avanzada
        if (query) {
          const searchTerms = query.toLowerCase().split(' ').filter(term => term.length > 0);
          
          results = results.filter(product => {
            // Búsqueda en múltiples campos con puntuación
            const nameMatches = searchTerms.filter(term => 
              product.name.toLowerCase().includes(term)
            ).length;
            
            const colorMatches = searchTerms.filter(term => 
              product.color.toLowerCase().includes(term)
            ).length;
            
            // Considerar relevante si coincide al menos con un término en cualquier campo
            return nameMatches > 0 || colorMatches > 0;
          });
          
          // Ordenar por relevancia (cantidad de coincidencias)
          results.sort((a, b) => {
            const aRelevance = searchTerms.filter(term => 
              a.name.toLowerCase().includes(term) || a.color.toLowerCase().includes(term)
            ).length;
            
            const bRelevance = searchTerms.filter(term => 
              b.name.toLowerCase().includes(term) || b.color.toLowerCase().includes(term)
            ).length;
            
            return bRelevance - aRelevance;
          });
        }
        
        // Almacenar en sessionStorage para recuperar al volver a la página
        sessionStorage.setItem('lastSearchResults', JSON.stringify(results));
        
        setSearchResults(results);
      } catch (error) {
        console.error("Error al procesar la búsqueda:", error);
      } finally {
        setIsLoading(false);
      }
    }, 500); // Reducido a 500ms para mayor responsividad
    
    return () => clearTimeout(searchTimeout);
  };

  const toggleStore = (storeId: string) => {
    setStores(prev => 
      prev.includes(storeId) 
        ? prev.filter(s => s !== storeId)
        : [...prev, storeId]
    );
  };

  return (
    <SpotlightContainer>
      <div className="container mx-auto px-4 py-12 max-w-6xl">
        <h1 className="font-playfair text-3xl text-center mb-8">
          <GoldText>Productos</GoldText>
        </h1>
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Filtros */}
          <div className="md:col-span-1">
            <GoldBorder className="p-4 sticky top-24">
              <h2 className="font-playfair text-lg gold-text mb-4">Filtros</h2>
              
              <div className="space-y-6">
                <div>
                  <label className="text-sm font-medium mb-2 block">Categoría</label>
                  <Select value={category} onValueChange={setCategory}>
                    <SelectTrigger className="bg-black border-amber-deep/30">
                      <SelectValue placeholder="Todas las categorías" />
                    </SelectTrigger>
                    <SelectContent className="bg-black border-amber-deep/30">
                      <SelectItem value="all">Todas</SelectItem>
                      <SelectItem value="tops">Tops</SelectItem>
                      <SelectItem value="bottoms">Pantalones y faldas</SelectItem>
                      <SelectItem value="dresses">Vestidos</SelectItem>
                      <SelectItem value="outerwear">Abrigos</SelectItem>
                      <SelectItem value="accessories">Accesorios</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <label className="text-sm font-medium mb-2 block">Precio (€)</label>
                  <div className="pt-4 pb-2">
                    <Slider 
                      defaultValue={[0, 500]} 
                      max={500} 
                      step={10}
                      value={priceRange}
                      onValueChange={setPriceRange}
                    />
                  </div>
                  <div className="flex justify-between text-xs text-amber-deep/70">
                    <span>{priceRange[0]}€</span>
                    <span>{priceRange[1]}€</span>
                  </div>
                </div>
                
                <div>
                  <label className="text-sm font-medium mb-2 block">Tiendas</label>
                  <div className="space-y-2">
                    {storeOptions.map(store => (
                      <div key={store.id} className="flex items-center space-x-2">
                        <Checkbox 
                          id={store.id} 
                          checked={stores.includes(store.id)}
                          onCheckedChange={() => toggleStore(store.id)}
                        />
                        <Label htmlFor={store.id} className="text-sm cursor-pointer">
                          {store.label}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>
                
                <Button 
                  onClick={handleSearch} 
                  className="w-full bg-amber-deep text-black hover:bg-amber-600"
                >
                  Aplicar filtros
                </Button>
              </div>
            </GoldBorder>
          </div>
          
          {/* Resultados */}
          <div className="md:col-span-3">
            <div className="mb-8">
              <div className="flex gap-3">
                <Input 
                  placeholder="Buscar productos..." 
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  className="bg-black border-amber-deep/30"
                />
                <Button 
                  onClick={handleSearch}
                  className="bg-amber-deep text-black hover:bg-amber-600"
                >
                  Buscar
                </Button>
              </div>
            </div>
            
            <Tabs defaultValue="grid">
              <div className="flex justify-between items-center mb-4">
                <p className="text-sm text-amber-deep/70">
                  {searchResults.length} productos encontrados
                </p>
                <TabsList className="bg-black-elegant border border-amber-deep/30">
                  <TabsTrigger value="grid">
                    <i className="fas fa-th-large"></i>
                  </TabsTrigger>
                  <TabsTrigger value="list">
                    <i className="fas fa-list"></i>
                  </TabsTrigger>
                </TabsList>
              </div>
              
              <TabsContent value="grid">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {isLoading ? (
                    Array(6).fill(0).map((_, i) => (
                      <div key={i} className="bg-black-elegant p-4 rounded-md animate-pulse h-64"></div>
                    ))
                  ) : searchResults.length > 0 ? (
                    searchResults.map(product => (
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
                            <span className="font-montserrat text-xs text-amber-deep">{product.price}€</span>
                          </div>
                          <Button variant="link" size="sm" className="text-xs p-0 h-auto mt-2 text-amber-deep">
                            Ver producto
                          </Button>
                        </div>
                      </GoldBorder>
                    ))
                  ) : (
                    <div className="col-span-full text-center py-8">
                      <p className="text-amber-deep/70">No se encontraron productos que coincidan con tu búsqueda.</p>
                    </div>
                  )}
                </div>
              </TabsContent>
              
              <TabsContent value="list">
                <div className="space-y-3">
                  {isLoading ? (
                    Array(4).fill(0).map((_, i) => (
                      <div key={i} className="bg-black-elegant p-4 rounded-md animate-pulse h-20"></div>
                    ))
                  ) : searchResults.length > 0 ? (
                    searchResults.map(product => (
                      <GoldBorder key={product.id} className="overflow-hidden bg-black">
                        <div className="p-3 flex">
                          <div className="w-20 h-20 overflow-hidden mr-3">
                            <img 
                              src={product.imageUrl} 
                              alt={product.name} 
                              className="w-full h-full object-cover"
                            />
                          </div>
                          <div className="flex-1 flex justify-between items-center">
                            <div>
                              <h4 className="font-playfair text-amber-300">{product.name}</h4>
                              <p className="text-xs opacity-70">{product.store} · {product.category}</p>
                            </div>
                            <div className="text-right">
                              <span className="font-montserrat text-sm text-amber-deep">{product.price}€</span>
                              <Button variant="link" size="sm" className="text-xs p-0 h-auto block mt-1 text-amber-deep">
                                Ver producto
                              </Button>
                            </div>
                          </div>
                        </div>
                      </GoldBorder>
                    ))
                  ) : (
                    <div className="text-center py-8">
                      <p className="text-amber-deep/70">No se encontraron productos que coincidan con tu búsqueda.</p>
                    </div>
                  )}
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
    </SpotlightContainer>
  );
};

export default ProductSearchPage;
