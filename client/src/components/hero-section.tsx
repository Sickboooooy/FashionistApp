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
          Your Personal <GoldText>AI Stylist</GoldText><br />
          <span className="font-light">with an Artisanal Touch</span>
        </h2>
        <p className="font-cormorant text-lg md:text-xl mb-10 mx-auto max-w-2xl">
          Upload your garments or describe your needs for personalized outfit suggestions, 
          enhanced with exclusive handcrafted designs by Selene.
        </p>
        
        <InputMethods />
        
        <div className="mt-8">
          <GoldButton 
            variant="rounded" 
            onClick={scrollToShowcase}
          >
            EXPLORE INSPIRATIONS
          </GoldButton>
        </div>
      </div>
    </SpotlightContainer>
  );
};

export default HeroSection;
