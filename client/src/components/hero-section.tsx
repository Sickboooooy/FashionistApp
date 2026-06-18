import { useState, useEffect } from 'react';
import { Link } from 'wouter';
import SpotlightContainer from './ui/spotlight-container';
import GoldText from './ui/gold-text';
import InputMethods from './input-methods';
import GoldButton from './ui/gold-button';

const HeroSection = () => {
  const [isVisible, setIsVisible] = useState(false);
  
  useEffect(() => {
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
    <>
      {/* Magazine-style Hero Section */}
      <div className="relative h-[75vh] w-full overflow-hidden bg-stone-950">
        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1500917293891-ef795e70e1f6?q=80&w=1920&auto=format&fit=crop')] bg-cover bg-center filter brightness-50 contrast-110"></div>
        <div className="absolute inset-0 bg-gradient-to-t from-stone-950 via-stone-950/40 to-transparent"></div>

        <div className="relative z-10 h-full flex flex-col justify-center items-center text-center px-4">
          <h2 className="text-amber-400 text-xs md:text-sm uppercase tracking-[0.3em] mb-4 opacity-100">
            Issue 27 • Autumn Vibes
          </h2>
          
          <h1 className="font-serif text-5xl md:text-7xl lg:text-8xl text-stone-100 mb-6 leading-tight drop-shadow-2xl opacity-100">
            THE NEW <br/> 
            <span className="italic text-amber-500 font-normal">CLASSIC</span>
          </h1>
          
          <p className="max-w-2xl text-stone-300 text-base md:text-lg font-light mb-8 leading-relaxed opacity-100">
            Redefining your personal style with the power of artificial intelligence.
            Upload your wardrobe, let Anna curate your look.
          </p>
          
          <div className="opacity-100">
            <Link
              to="/closet"
              className="group relative px-8 py-3 bg-transparent overflow-hidden rounded-sm border border-amber-500 transition-all hover:bg-amber-500 inline-block"
            >
              <span className="relative z-10 text-amber-500 font-bold uppercase tracking-widest group-hover:text-stone-900 text-sm">
                Start Styling
              </span>
            </Link>
          </div>
        </div>
      </div>

      {/* Interactive Options Section */}
      <SpotlightContainer className="py-16 relative overflow-hidden bg-stone-950">
        <div className="absolute inset-0 bg-gradient-radial from-amber-deep/5 to-transparent opacity-30"></div>
        
        <div className={`container mx-auto text-center max-w-3xl transition-all duration-1000 relative z-10 ${
          isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
        }`}>
          <h2 className="font-playfair text-3xl md:text-4xl mb-6 leading-tight tracking-wide">
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
    </>
  );
};

export default HeroSection;
