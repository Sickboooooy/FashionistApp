
import { useState, useEffect, useCallback } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import GoldBorder from '@/components/ui/gold-border';
import GoldText from '@/components/ui/gold-text';
import SpotlightContainer from '@/components/ui/spotlight-container';
import { Slider } from '@/components/ui/slider';

interface SearchProduct {
  id: string;
  name: string;
  price: number; // en pesos MXN
  priceLabel: string; // "$399.00"
  category: string;
  color: string;
  imageUrl: string;
}

const MAX_PRICE = 2000; // MXN

const ProductSearchPage = () => {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('all');
  const [priceRange, setPriceRange] = useState([0, MAX_PRICE]);
  const [searchResults, setSearchResults] = useState<SearchProduct[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Consulta el inventario REAL de la tienda. Sin datos simulados: si no hay
  // resultados, mostramos un estado vacío honesto.
  const runSearch = useCallback(async () => {
    setIsLoading(true);
    try {
      const apiParams = new URLSearchParams();
      if (query) apiParams.set('q', query);
      if (category !== 'all') apiParams.set('category', category);
      apiParams.set('minPrice', priceRange[0].toString());
      apiParams.set('maxPrice', priceRange[1].toString());

      const response = await fetch(`/api/products?${apiParams.toString()}`);
      if (!response.ok) throw new Error(`API respondió ${response.status}`);

      const data = await response.json();
      const results: SearchProduct[] = Array.isArray(data)
        ? data.map((p: any) => ({
            id: String(p.id),
            name: p.name,
            price: p.priceMXN ?? (p.price ?? 0) / 100,
            priceLabel: p.priceFormatted ?? `$${(((p.price ?? 0) / 100)).toFixed(2)}`,
            category: p.category,
            color: (p.tags && p.tags[0]) || '',
            imageUrl: p.imageUrl || '',
          }))
        : [];

      setSearchResults(results);
    } catch (error) {
      console.error('Error al consultar el inventario:', error);
      setSearchResults([]);
    } finally {
      setIsLoading(false);
    }
  }, [query, category, priceRange]);

  // Cargar el catálogo real al entrar a la página.
  useEffect(() => {
    runSearch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
                      <SelectItem value="top">Tops</SelectItem>
                      <SelectItem value="bottom">Pantalones y faldas</SelectItem>
                      <SelectItem value="dress">Vestidos</SelectItem>
                      <SelectItem value="outerwear">Abrigos</SelectItem>
                      <SelectItem value="shoes">Calzado</SelectItem>
                      <SelectItem value="accessory">Accesorios</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="text-sm font-medium mb-2 block">Precio (MXN)</label>
                  <div className="pt-4 pb-2">
                    <Slider
                      defaultValue={[0, MAX_PRICE]}
                      max={MAX_PRICE}
                      step={50}
                      value={priceRange}
                      onValueChange={setPriceRange}
                    />
                  </div>
                  <div className="flex justify-between text-xs text-amber-deep/70">
                    <span>${priceRange[0]}</span>
                    <span>${priceRange[1]}</span>
                  </div>
                </div>

                <Button
                  onClick={runSearch}
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
                  onKeyDown={e => { if (e.key === 'Enter') runSearch(); }}
                  className="bg-black border-amber-deep/30"
                />
                <Button
                  onClick={runSearch}
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
                              <p className="text-xs opacity-70 capitalize">{product.category}</p>
                            </div>
                            <span className="font-montserrat text-xs text-amber-deep">{product.priceLabel}</span>
                          </div>
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
                              <p className="text-xs opacity-70 capitalize">{product.category}</p>
                            </div>
                            <div className="text-right">
                              <span className="font-montserrat text-sm text-amber-deep">{product.priceLabel}</span>
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
