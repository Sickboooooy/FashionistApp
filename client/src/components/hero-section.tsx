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
      <div className="relative -mt-24 h-[88vh] min-h-[560px] w-full overflow-hidden bg-stone-950">
        <div className="absolute inset-0 scale-105 bg-[url('https://images.unsplash.com/photo-1500917293891-ef795e70e1f6?q=80&w=1920&auto=format&fit=crop')] bg-cover bg-center filter brightness-[0.45] contrast-110"></div>
        {/* Layered overlays: top for navbar legibility, bottom to blend into page, side vignette */}
        <div className="absolute inset-0 bg-gradient-to-t from-stone-950 via-stone-950/30 to-stone-950/70"></div>
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_35%,rgba(12,10,9,0.7)_100%)]"></div>

        <div
          className={`relative z-10 h-full flex flex-col justify-center items-center text-center px-4 transition-all duration-1000 ${
            isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'
          }`}
        >
          <h2 className="text-amber-400 text-xs md:text-sm uppercase tracking-[0.35em] mb-5">
            Issue 27 &middot; Autumn Vibes
          </h2>

          <h1 className="font-serif text-5xl md:text-7xl lg:text-8xl text-stone-100 mb-6 leading-[0.95] drop-shadow-2xl">
            THE NEW <br/>
            <span className="italic text-amber-500 font-normal">CLASSIC</span>
          </h1>

          <p className="max-w-xl text-stone-300/90 text-base md:text-lg font-light mb-9 leading-relaxed">
            Redefining your personal style with the power of artificial intelligence.
            Upload your wardrobe, let Anna curate your look.
          </p>

          <Link
            to="/closet"
            className="gold-shine group relative inline-flex items-center gap-2 px-9 py-3.5 rounded-full bg-amber-500/10 border border-amber-500/70 backdrop-blur-md cursor-pointer transition-all duration-300 hover:bg-amber-500 hover:border-amber-500 hover:shadow-[0_0_30px_-4px_rgba(255,215,0,0.45)]"
          >
            <span className="relative z-10 text-amber-300 font-semibold uppercase tracking-[0.2em] text-xs md:text-sm transition-colors group-hover:text-stone-900">
              Start Styling
            </span>
          </Link>
        </div>

        {/* Scroll cue */}
        <button
          onClick={scrollToShowcase}
          aria-label="Desplázate a las inspiraciones"
          className="absolute bottom-6 left-1/2 -translate-x-1/2 z-10 flex flex-col items-center gap-1.5 text-amber-400/70 hover:text-amber-400 transition-colors cursor-pointer"
        >
          <span className="text-[10px] uppercase tracking-[0.25em]">Scroll</span>
          <span className="block w-px h-8 bg-gradient-to-b from-amber-400/70 to-transparent animate-pulse"></span>
        </button>
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
