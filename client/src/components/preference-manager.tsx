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

  const [colorPalette, setColorPalette] = useState<string[]>([
    '#000000', // Negro
    '#FFFFFF', // Blanco
    '#0047AB', // Azul
    '#8B0000', // Rojo oscuro
    '#006400', // Verde oscuro
    '#800080', // Púrpura
    '#FFD700', // Dorado
    '#C0C0C0', // Plata
    '#8B4513', // Marrón
    '#FF69B4', // Rosa
  ]);
  
  const [selectedColors, setSelectedColors] = useState<string[]>(['#000000', '#FFFFFF']);
  
  const [seasonPreferences, setSeasonPreferences] = useState<{name: string, selected: boolean}[]>([
    { name: 'Primavera', selected: true },
    { name: 'Verano', selected: true },
    { name: 'Otoño', selected: false },
    { name: 'Invierno', selected: false },
  ]);

  const toggleStylePreference = (index: number) => {
    const updatedPreferences = [...stylePreferences];
    updatedPreferences[index].selected = !updatedPreferences[index].selected;
    setStylePreferences(updatedPreferences);
  };
  
  const toggleSeasonPreference = (index: number) => {
    const updatedPreferences = [...seasonPreferences];
    updatedPreferences[index].selected = !updatedPreferences[index].selected;
    setSeasonPreferences(updatedPreferences);
  };

  const toggleColorSelection = (color: string) => {
    if (selectedColors.includes(color)) {
      setSelectedColors(selectedColors.filter(c => c !== color));
    } else {
      setSelectedColors([...selectedColors, color]);
    }
  };

  const updateOccasionPriority = (index: number, newPriority: number) => {
    const updatedOccasions = [...occasionPreferences];
    updatedOccasions[index].priority = newPriority;
    
    // Actualizar etiqueta basada en la prioridad
    updatedOccasions[index].label = getPriorityLabel(newPriority);
    
    setOccasionPreferences(updatedOccasions);
  };

  const getPriorityLabel = (priority: number): string => {
    if (priority >= 0.7) return 'Alta Prioridad';
    if (priority >= 0.4) return 'Media Prioridad';
    return 'Baja Prioridad';
  };

  const savePreferences = async () => {
    try {
      // Format preferences for API
      const selectedStyles = stylePreferences
        .filter(style => style.selected)
        .map(style => style.name);
      
      const selectedSeasons = seasonPreferences
        .filter(season => season.selected)
        .map(season => season.name);
      
      const formattedOccasions = occasionPreferences.map(occasion => ({
        name: occasion.name,
        priority: occasion.priority
      }));
      
      // In a real app, we would save to the backend
      // const response = await apiRequest('POST', '/api/users/1/preferences', {
      //   styles: selectedStyles,
      //   occasions: formattedOccasions,
      //   seasons: selectedSeasons,
      //   colors: selectedColors
      // });
      
      // Update context
      updatePreferences({
        styles: selectedStyles,
        occasions: formattedOccasions,
        seasons: selectedSeasons,
        colors: selectedColors
      });
      
      toast({
        title: 'Preferencias Guardadas',
        description: 'Tus preferencias de estilo han sido actualizadas',
      });
    } catch (error) {
      toast({
        title: 'Error al Guardar',
        description: 'Hubo un problema al guardar tus preferencias',
        variant: 'destructive',
      });
    }
  };

  return (
    <SpotlightContainer>
      <div className="container mx-auto max-w-4xl">
        <h2 className="font-playfair text-2xl md:text-3xl mb-4 text-center">
          <GoldText>Preferencias</GoldText>
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Style Preferences */}
          <GoldBorder className="p-6 h-full">
            <h3 className="font-playfair text-xl mb-6 gold-text flex items-center">
              <i className="fas fa-paint-brush mr-3 text-amber-deep"></i> Estilos Preferidos
            </h3>
            
            <div className="space-y-4">
              {stylePreferences.map((style, index) => (
                <div 
                  key={style.name} 
                  className={`flex items-center justify-between p-2 rounded-md transition-colors cursor-pointer ${
                    style.selected ? 'bg-amber-deep/10 border border-amber-deep/30' : 'hover:bg-black-elegant border border-transparent'
                  }`}
                  onClick={() => toggleStylePreference(index)}
                >
                  <div className="flex items-center">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center mr-3 ${
                      style.selected ? 'bg-amber-deep text-black' : 'bg-black border border-amber-deep/30'
                    }`}>
                      {style.selected ? (
                        <i className="fas fa-check text-xs"></i>
                      ) : (
                        <i className={`fas ${
                          style.name === 'Casual Chic' ? 'fa-tshirt' :
                          style.name === 'Business Formal' ? 'fa-briefcase' :
                          style.name === 'Bohemian' ? 'fa-leaf' :
                          style.name === 'Evening Elegance' ? 'fa-moon' :
                          'fa-running'
                        } text-xs text-amber-deep/70`}></i>
                      )}
                    </div>
                    <label className="font-cormorant text-lg cursor-pointer">
                      {style.name}
                    </label>
                  </div>
                  <div 
                    className={`w-6 h-6 border rounded-md flex items-center justify-center cursor-pointer ${
                      style.selected ? 'border-amber-deep bg-amber-deep/20' : 'border-amber-deep/30 bg-black'
                    }`}
                  >
                    {style.selected && <i className="fas fa-check text-xs gold-text"></i>}
                  </div>
                </div>
              ))}
            </div>
            
            {/* Seasons Preferences */}
            <h3 className="font-playfair text-xl my-6 gold-text flex items-center">
              <i className="fas fa-sun mr-3 text-amber-deep"></i> Temporadas
            </h3>
            
            <div className="grid grid-cols-2 gap-3">
              {seasonPreferences.map((season, index) => (
                <div 
                  key={season.name} 
                  className={`flex flex-col items-center p-3 rounded-lg cursor-pointer transition-all ${
                    season.selected ? 'bg-amber-deep/10 border border-amber-deep/30' : 'hover:bg-black-elegant border border-transparent'
                  }`}
                  onClick={() => toggleSeasonPreference(index)}
                >
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center mb-2 ${
                    season.selected ? 'bg-amber-deep text-black' : 'bg-black border border-amber-deep/30'
                  }`}>
                    <i className={`fas ${
                      season.name === 'Primavera' ? 'fa-seedling' :
                      season.name === 'Verano' ? 'fa-sun' :
                      season.name === 'Otoño' ? 'fa-leaf' :
                      'fa-snowflake'
                    } text-${season.selected ? 'black' : 'amber-deep/70'}`}></i>
                  </div>
                  <span className="font-cormorant text-center">
                    {season.name}
                  </span>
                </div>
              ))}
            </div>
          </GoldBorder>
          
          <div className="space-y-6">
            {/* Color Palette */}
            <GoldBorder className="p-6">
              <h3 className="font-playfair text-xl mb-6 gold-text flex items-center">
                <i className="fas fa-palette mr-3 text-amber-deep"></i> Paleta de Colores
              </h3>
              
              <div className="grid grid-cols-5 gap-2">
                {colorPalette.map((color) => (
                  <div 
                    key={color} 
                    className={`relative w-full aspect-square rounded-full cursor-pointer border-2 ${
                      selectedColors.includes(color) ? 'border-amber-deep' : 'border-transparent'
                    } hover:scale-110 transition-all`}
                    style={{ backgroundColor: color }}
                    onClick={() => toggleColorSelection(color)}
                  >
                    {selectedColors.includes(color) && (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <i className={`fas fa-check text-xs ${
                          color === '#FFFFFF' || color === '#FFD700' || color === '#C0C0C0' || color === '#FF69B4'
                            ? 'text-black'
                            : 'text-white'
                        }`}></i>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </GoldBorder>
            
            {/* Occasion Settings */}
            <GoldBorder className="p-6">
              <h3 className="font-playfair text-xl mb-6 gold-text flex items-center">
                <i className="fas fa-calendar-day mr-3 text-amber-deep"></i> Prioridad de Ocasiones
              </h3>
              
              <div className="space-y-6">
                {occasionPreferences.map((occasion, index) => (
                  <div key={occasion.name}>
                    <div className="flex justify-between mb-2">
                      <label className="font-cormorant text-lg flex items-center">
                        <i className={`fas ${
                          occasion.name === 'Work' ? 'fa-briefcase' :
                          occasion.name === 'Social Events' ? 'fa-users' :
                          occasion.name === 'Travel' ? 'fa-plane' :
                          'fa-glass-cheers'
                        } mr-2 text-amber-deep/70`}></i>
                        {occasion.name}
                      </label>
                      <span className={`font-montserrat text-xs px-2 py-0.5 rounded-full ${
                        occasion.priority >= 0.7 
                          ? 'bg-amber-deep/20 text-amber-deep' 
                          : occasion.priority >= 0.4 
                            ? 'bg-amber-deep/10 text-amber-deep/80' 
                            : 'bg-black border border-amber-deep/30 text-amber-deep/60'
                      }`}>
                        {occasion.label}
                      </span>
                    </div>
                    <div className="group">
                      <div className="h-3 bg-black rounded-full gold-border overflow-hidden">
                        <div 
                          className="bg-gradient-to-r from-gold-light to-gold-dark h-full rounded-full"
                          style={{ width: `${occasion.priority * 100}%` }}
                        ></div>
                      </div>
                      <input 
                        type="range" 
                        min="0" 
                        max="1" 
                        step="0.05" 
                        value={occasion.priority}
                        onChange={(e) => updateOccasionPriority(index, parseFloat(e.target.value))}
                        className="w-full mt-2 appearance-none bg-transparent cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-amber-deep [&::-webkit-slider-thumb]:border [&::-webkit-slider-thumb]:border-black"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </GoldBorder>
          </div>
        </div>
        
        <div className="text-center mt-10">
          <GoldButton onClick={savePreferences} className="px-10 py-3">
            <i className="fas fa-save mr-2"></i> GUARDAR PREFERENCIAS
          </GoldButton>
          <p className="font-cormorant text-sm mt-3 opacity-70">
            Recomendaremos productos y diseños basados en tus preferencias
          </p>
        </div>
      </div>
    </SpotlightContainer>
  );
};

export default PreferenceManager;
