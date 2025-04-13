
import { useState } from 'react';
import { useLocation } from 'wouter';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import SpotlightContainer from '@/components/ui/spotlight-container';
import GoldBorder from '@/components/ui/gold-border';
import GoldText from '@/components/ui/gold-text';
import ProductSuggestions from '@/components/product-suggestions';

const ProductSearchPage = () => {
  const [location, setLocation] = useLocation();
  const params = new URLSearchParams(location.split('?')[1]);
  
  const [searchTerm, setSearchTerm] = useState(params.get('q') || '');
  const [category, setCategory] = useState(params.get('category') || 'all');
  const [occasion, setOccasion] = useState(params.get('occasion') || '');
  
  const handleSearch = () => {
    const params = new URLSearchParams();
    if (searchTerm) params.set('q', searchTerm);
    if (category !== 'all') params.set('category', category);
    if (occasion) params.set('occasion', occasion);
    
    setLocation(`/product-search?${params.toString()}`);
  };
  
  return (
    <SpotlightContainer>
      <div className="container mx-auto max-w-6xl py-8">
        <div className="text-center mb-8">
          <h1 className="font-playfair text-3xl md:text-4xl mb-2">
            <GoldText>Descubre</GoldText> Moda a tu Estilo
          </h1>
          <p className="font-cormorant text-lg mb-8 opacity-80 max-w-2xl mx-auto">
            Encuentra las prendas y accesorios perfectos que complementan tu estilo único
          </p>
        </div>
        
        <GoldBorder className="p-6 mb-12">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-grow">
              <Input
                type="text"
                placeholder="Buscar productos de moda..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="h-12 bg-black border-amber-deep/50 text-cream-soft focus:border-amber-deep"
              />
            </div>
            
            <div className="md:w-48">
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger id="category" className="h-12 bg-black border-amber-deep/50 text-cream-soft">
                  <SelectValue placeholder="Categoría" />
                </SelectTrigger>
                <SelectContent className="bg-black border-amber-deep/50 text-cream-soft">
                  <SelectItem value="all">Todas las categorías</SelectItem>
                  <SelectItem value="ropa">Ropa</SelectItem>
                  <SelectItem value="zapatos">Zapatos</SelectItem>
                  <SelectItem value="accesorios">Accesorios</SelectItem>
                  <SelectItem value="bolsos">Bolsos</SelectItem>
                  <SelectItem value="joyas">Joyas</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="md:w-48">
              <Select value={occasion} onValueChange={setOccasion}>
                <SelectTrigger id="occasion" className="h-12 bg-black border-amber-deep/50 text-cream-soft">
                  <SelectValue placeholder="Ocasión" />
                </SelectTrigger>
                <SelectContent className="bg-black border-amber-deep/50 text-cream-soft">
                  <SelectItem value="">Cualquier ocasión</SelectItem>
                  <SelectItem value="casual">Casual</SelectItem>
                  <SelectItem value="formal">Formal</SelectItem>
                  <SelectItem value="trabajo">Trabajo</SelectItem>
                  <SelectItem value="fiesta">Fiesta</SelectItem>
                  <SelectItem value="deporte">Deporte</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <Button 
              onClick={handleSearch}
              className="h-12 bg-amber-deep text-black hover:bg-amber-deep/90 px-8"
            >
              <i className="fas fa-search mr-2"></i>
              Buscar
            </Button>
          </div>
          
          <div className="flex flex-wrap gap-2 mt-4">
            <span className="text-sm text-amber-deep/70">Búsquedas populares:</span>
            {['Vestidos', 'Zapatos elegantes', 'Accesorios dorados', 'Bolsos', 'Jeans'].map((term) => (
              <Button 
                key={term} 
                variant="link" 
                className="text-amber-deep hover:text-amber-deep/80 p-0 h-auto text-sm"
                onClick={() => {
                  setSearchTerm(term);
                  handleSearch();
                }}
              >
                {term}
              </Button>
            ))}
          </div>
        </GoldBorder>
        
        <ProductSuggestions 
          searchTerm={searchTerm} 
          category={category}
          occasion={occasion}
        />
      </div>
    </SpotlightContainer>
  );
};

export default ProductSearchPage;
