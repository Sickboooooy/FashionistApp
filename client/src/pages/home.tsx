import { FC } from 'react';
import HeroSection from '@/components/hero-section';
import OutfitShowcase from '@/components/outfit-showcase';
import SeleneDesigns from '@/components/selene-designs';
import PreferenceManager from '@/components/preference-manager';

const Home: FC = () => {
  return (
    <>
      <HeroSection />
      <OutfitShowcase />
      <SeleneDesigns />
      <PreferenceManager />
    </>
  );
};

export default Home;
