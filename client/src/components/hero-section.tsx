import { useState, useEffect } from 'react';
import SpotlightContainer from './ui/spotlight-container';
import GoldText from './ui/gold-text';
import InputMethods from './input-methods';
import GoldButton from './ui/gold-button';

const HeroSection = () => {
  const [isVisible, setIsVisible] = useState(false);
  
  useEffect(() => {
    // Añadir efecto de aparición gradual cuando el componente monta
    const timer = setTimeout(() => {
      setIsVisible(true);
    }, 100);
    return () => clearTimeout(timer);
  }, []);
  
  const scrollToShowcase = () => {
    const showcaseSection = document.getElementById('outfit-showcase');
    if (showcaseSection) {
      showcaseSection.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <SpotlightContainer className="pt-16 pb-20 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-radial from-amber-deep/5 to-transparent opacity-30"></div>
      
      <div className={`container mx-auto text-center max-w-3xl transition-all duration-1000 relative z-10 ${
        isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
      }`}>
        <h2 className="font-playfair text-4xl md:text-5xl lg:text-6xl mb-6 leading-tight tracking-wide">
          <GoldText>Anna</GoldText>
        </h2>
        <p className="font-cormorant text-lg md:text-xl text-cream-soft/90 mb-10 italic">
          Elegancia personalizada
        </p>
        
        <div className={`transition-all duration-1000 delay-300 ${
          isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
        }`}>
          <InputMethods />
        </div>
        
        <div className={`mt-10 transition-all duration-1000 delay-500 ${
          isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
        }`}>
          <GoldButton 
            variant="rounded" 
            onClick={scrollToShowcase}
            className="px-8 py-3 text-sm tracking-wider"
          >
            INSPIRACIONES
          </GoldButton>
        </div>
      </div>
    </SpotlightContainer>
  );
};

export default HeroSection;
