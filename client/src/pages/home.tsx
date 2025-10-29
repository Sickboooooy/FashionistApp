import { FC } from 'react';
import HeroSection from '@/components/hero-section';
import OutfitShowcase from '@/components/outfit-showcase';
import AnnaDesigns from '@/components/anna-designs';
import PreferenceManager from '@/components/preference-manager';

const Home: FC = () => {
  return (
    <>
      <HeroSection />
      <OutfitShowcase />
      <AnnaDesigns />
      <PreferenceManager />
    </>
  );
};

export default Home;
