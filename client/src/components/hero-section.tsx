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
    <SpotlightContainer className="pt-10 pb-16">
      <div className={`container mx-auto text-center max-w-3xl transition-all duration-1000 ${
        isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
      }`}>
        <h2 className="font-playfair text-3xl md:text-4xl lg:text-5xl mb-6 leading-tight">
          <GoldText>Selene</GoldText> Style
        </h2>
        
        <div className={`transition-all duration-1000 delay-300 ${
          isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
        }`}>
          <InputMethods />
        </div>
        
        <div className={`mt-8 transition-all duration-1000 delay-500 ${
          isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
        }`}>
          <GoldButton 
            variant="rounded" 
            onClick={scrollToShowcase}
          >
            EXPLORAR INSPIRACIONES
          </GoldButton>
        </div>
      </div>
    </SpotlightContainer>
  );
};

export default HeroSection;
