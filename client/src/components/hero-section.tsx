import SpotlightContainer from './ui/spotlight-container';
import GoldText from './ui/gold-text';
import InputMethods from './input-methods';
import GoldButton from './ui/gold-button';

const HeroSection = () => {
  const scrollToShowcase = () => {
    const showcaseSection = document.getElementById('outfit-showcase');
    if (showcaseSection) {
      showcaseSection.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <SpotlightContainer className="pt-10 pb-16">
      <div className="container mx-auto text-center max-w-3xl">
        <h2 className="font-playfair text-3xl md:text-4xl lg:text-5xl mb-6 leading-tight">
          <GoldText>Selene</GoldText> Style
        </h2>
        
        <InputMethods />
        
        <div className="mt-8">
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
