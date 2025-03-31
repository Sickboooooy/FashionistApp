import { useState } from 'react';
import GoldBorder from './ui/gold-border';
import GoldText from './ui/gold-text';
import GoldButton from './ui/gold-button';
import SpotlightContainer from './ui/spotlight-container';
import { usePreferences } from '../contexts/preferences-context';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';

interface StylePreference {
  name: string;
  selected: boolean;
}

interface OccasionPreference {
  name: string;
  priority: number;
  label: string;
}

const PreferenceManager = () => {
  const { preferences, updatePreferences } = usePreferences();
  const { toast } = useToast();
  
  // Initialize style preferences
  const [stylePreferences, setStylePreferences] = useState<StylePreference[]>([
    { name: 'Casual Chic', selected: true },
    { name: 'Business Formal', selected: true },
    { name: 'Bohemian', selected: false },
    { name: 'Evening Elegance', selected: false },
    { name: 'Sporty', selected: false },
  ]);

  // Initialize occasion preferences
  const [occasionPreferences, setOccasionPreferences] = useState<OccasionPreference[]>([
    { name: 'Work', priority: 0.75, label: 'High Priority' },
    { name: 'Social Events', priority: 0.5, label: 'Medium Priority' },
    { name: 'Travel', priority: 0.25, label: 'Low Priority' },
    { name: 'Special Events', priority: 0.5, label: 'Medium Priority' },
  ]);

  const toggleStylePreference = (index: number) => {
    const updatedPreferences = [...stylePreferences];
    updatedPreferences[index].selected = !updatedPreferences[index].selected;
    setStylePreferences(updatedPreferences);
  };

  const getPriorityLabel = (priority: number): string => {
    if (priority >= 0.7) return 'High Priority';
    if (priority >= 0.4) return 'Medium Priority';
    return 'Low Priority';
  };

  const savePreferences = async () => {
    try {
      // Format preferences for API
      const selectedStyles = stylePreferences
        .filter(style => style.selected)
        .map(style => style.name);
      
      const formattedOccasions = occasionPreferences.map(occasion => ({
        name: occasion.name,
        priority: occasion.priority
      }));
      
      // In a real app, we would save to the backend
      // const response = await apiRequest('POST', '/api/users/1/preferences', {
      //   styles: selectedStyles,
      //   occasions: formattedOccasions,
      // });
      
      // Update context
      updatePreferences({
        styles: selectedStyles,
        occasions: formattedOccasions,
      });
      
      toast({
        title: 'Preferences Saved',
        description: 'Your style preferences have been updated',
      });
    } catch (error) {
      toast({
        title: 'Error Saving Preferences',
        description: 'There was a problem saving your preferences',
        variant: 'destructive',
      });
    }
  };

  return (
    <SpotlightContainer>
      <div className="container mx-auto max-w-4xl">
        <h2 className="font-playfair text-2xl md:text-3xl mb-2 text-center">
          <GoldText>Personalize</GoldText> Your Experience
        </h2>
        <p className="font-cormorant text-center text-lg mb-10 opacity-80 max-w-2xl mx-auto">
          Set your preferences to receive recommendations tailored to your style
        </p>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Style Preferences */}
          <GoldBorder className="p-6 h-full">
            <h3 className="font-playfair text-xl mb-6 gold-text flex items-center">
              <i className="fas fa-paint-brush mr-3 text-amber-deep"></i> Style Preferences
            </h3>
            
            <div className="space-y-4">
              {stylePreferences.map((style, index) => (
                <div key={style.name} className="flex items-center justify-between">
                  <label className="font-cormorant text-lg cursor-pointer" onClick={() => toggleStylePreference(index)}>
                    {style.name}
                  </label>
                  <div 
                    className="w-6 h-6 border border-amber-deep rounded flex items-center justify-center bg-black cursor-pointer"
                    onClick={() => toggleStylePreference(index)}
                  >
                    {style.selected && <i className="fas fa-check text-xs gold-text"></i>}
                  </div>
                </div>
              ))}
            </div>
          </GoldBorder>
          
          {/* Occasion Settings */}
          <GoldBorder className="p-6 h-full">
            <h3 className="font-playfair text-xl mb-6 gold-text flex items-center">
              <i className="fas fa-calendar-day mr-3 text-amber-deep"></i> Occasion Settings
            </h3>
            
            <div className="space-y-6">
              {occasionPreferences.map((occasion, index) => (
                <div key={occasion.name}>
                  <div className="flex justify-between mb-2">
                    <label className="font-cormorant text-lg">{occasion.name}</label>
                    <span className="font-montserrat text-xs opacity-80">
                      {occasion.label}
                    </span>
                  </div>
                  <div className="h-2 bg-black rounded-full gold-border overflow-hidden">
                    <div 
                      className="bg-gradient-to-r from-gold-light to-gold-dark h-full rounded-full"
                      style={{ width: `${occasion.priority * 100}%` }}
                    ></div>
                  </div>
                </div>
              ))}
            </div>
          </GoldBorder>
        </div>
        
        <div className="text-center mt-8">
          <GoldButton onClick={savePreferences}>
            SAVE PREFERENCES
          </GoldButton>
        </div>
      </div>
    </SpotlightContainer>
  );
};

export default PreferenceManager;
