import { useState } from 'react';
import GoldBorder from './ui/gold-border';
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
      
      // Intentar guardar en el backend
      try {
        await apiRequest('POST', '/api/preferences', {
          styles: selectedStyles,
          occasions: formattedOccasions,
          seasons: selectedSeasons,
          colors: selectedColors
        });
      } catch (apiError) {
        console.warn("Error al guardar en el servidor, guardando localmente", apiError);
        // Guardado local fallback si el servidor falla
        localStorage.setItem('user_preferences', JSON.stringify({
          styles: selectedStyles,
          occasions: formattedOccasions,
          seasons: selectedSeasons,
          colors: selectedColors
        }));
      }
      
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
      console.error("Error al procesar preferencias:", error);
      toast({
        title: 'Error al Guardar',
        description: 'Hubo un problema al guardar tus preferencias',
        variant: 'destructive',
      });
    }
  };

  return (
    <SpotlightContainer className="pb-20">
      <div className="container mx-auto max-w-4xl">
        <span className="section-label">Tu perfil de estilo</span>
        <h2 className="section-title">
          <span className="italic text-amber-500">Preferencias</span>
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Style Preferences */}
          <GoldBorder className="p-6 h-full">
            <h3 className="font-serif text-xl mb-6 text-amber-400 flex items-center">
              <i className="fas fa-paint-brush mr-3 text-amber-500/70"></i> Estilos Preferidos
            </h3>
            
            <div className="space-y-3">
              {stylePreferences.map((style, index) => (
                <div 
                  key={style.name} 
                  className={`flex items-center justify-between p-3 rounded-xl transition-all cursor-pointer ${
                    style.selected ? 'bg-amber-500/10 border border-amber-500/25' : 'hover:bg-white/[0.03] border border-transparent'
                  }`}
                  onClick={() => toggleStylePreference(index)}
                >
                  <div className="flex items-center">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center mr-3 ${
                      style.selected ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40' : 'bg-white/[0.03] border border-amber-500/15'
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
                        } text-xs text-amber-500/50`}></i>
                      )}
                    </div>
                    <label className="text-stone-200 font-light cursor-pointer">
                      {style.name}
                    </label>
                  </div>
                  <div 
                    className={`w-5 h-5 border rounded-md flex items-center justify-center cursor-pointer ${
                      style.selected ? 'border-amber-500/50 bg-amber-500/15' : 'border-amber-500/20 bg-transparent'
                    }`}
                  >
                    {style.selected && <i className="fas fa-check text-[10px] text-amber-400"></i>}
                  </div>
                </div>
              ))}
            </div>
            
            {/* Seasons Preferences */}
            <h3 className="font-serif text-xl my-6 text-amber-400 flex items-center">
              <i className="fas fa-sun mr-3 text-amber-500/70"></i> Temporadas
            </h3>
            
            <div className="grid grid-cols-2 gap-3">
              {seasonPreferences.map((season, index) => (
                <div 
                  key={season.name} 
                  className={`flex flex-col items-center p-3 rounded-xl cursor-pointer transition-all ${
                    season.selected ? 'bg-amber-500/10 border border-amber-500/25' : 'hover:bg-white/[0.03] border border-transparent'
                  }`}
                  onClick={() => toggleSeasonPreference(index)}
                >
                  <div className={`w-11 h-11 rounded-full flex items-center justify-center mb-2 ${
                    season.selected ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40' : 'bg-white/[0.03] border border-amber-500/15'
                  }`}>
                    <i className={`fas ${
                      season.name === 'Primavera' ? 'fa-seedling' :
                      season.name === 'Verano' ? 'fa-sun' :
                      season.name === 'Otoño' ? 'fa-leaf' :
                      'fa-snowflake'
                    } ${season.selected ? 'text-amber-300' : 'text-amber-500/50'}`}></i>
                  </div>
                  <span className="text-stone-300/90 text-sm font-light text-center">
                    {season.name}
                  </span>
                </div>
              ))}
            </div>
          </GoldBorder>
          
          <div className="space-y-6">
            {/* Color Palette */}
            <GoldBorder className="p-6">
              <h3 className="font-serif text-xl mb-6 text-amber-400 flex items-center">
                <i className="fas fa-palette mr-3 text-amber-500/70"></i> Paleta de Colores
              </h3>
              
              <div className="grid grid-cols-5 gap-2">
                {colorPalette.map((color) => (
                  <div 
                    key={color} 
                    className={`relative w-full aspect-square rounded-full cursor-pointer border-2 ${
                      selectedColors.includes(color) ? 'border-amber-500/70 ring-2 ring-amber-500/20' : 'border-stone-700/50'
                    } hover:scale-105 transition-all`}
                    style={{ backgroundColor: color }}
                    onClick={() => toggleColorSelection(color)}
                  >
                    {selectedColors.includes(color) && (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <svg
                          className="w-4 h-4"
                          viewBox="0 0 20 20"
                          fill={
                            color.toUpperCase() === '#FFFFFF' ||
                            color.toUpperCase() === '#FFD700' ||
                            color.toUpperCase() === '#C0C0C0'
                              ? '#000000'
                              : '#FFFFFF'
                          }
                        >
                          <path
                            fillRule="evenodd"
                            clipRule="evenodd"
                            d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                          />
                        </svg>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </GoldBorder>
            
            {/* Occasion Settings */}
            <GoldBorder className="p-6">
              <h3 className="font-serif text-xl mb-6 text-amber-400 flex items-center">
                <i className="fas fa-calendar-day mr-3 text-amber-500/70"></i> Prioridad de Ocasiones
              </h3>
              
              <div className="space-y-6">
                {occasionPreferences.map((occasion, index) => (
                  <div key={occasion.name}>
                    <div className="flex justify-between mb-2">
                      <label className="text-stone-200 font-light flex items-center">
                        <i className={`fas ${
                          occasion.name === 'Work' ? 'fa-briefcase' :
                          occasion.name === 'Social Events' ? 'fa-users' :
                          occasion.name === 'Travel' ? 'fa-plane' :
                          'fa-glass-cheers'
                        } mr-2 text-amber-500/50`}></i>
                        {occasion.name}
                      </label>
                      <span className={`font-montserrat text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full ${
                        occasion.priority >= 0.7 
                          ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30' 
                          : occasion.priority >= 0.4 
                            ? 'bg-amber-500/10 text-amber-400/80 border border-amber-500/20' 
                            : 'bg-white/[0.03] border border-amber-500/15 text-stone-400'
                      }`}>
                        {occasion.label}
                      </span>
                    </div>
                    <div className="group">
                      <div className="h-2 bg-white/[0.04] rounded-full border border-amber-500/15 overflow-hidden">
                        <div 
                          className="bg-gradient-to-r from-amber-500/60 to-amber-400 h-full rounded-full"
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
                        className="w-full mt-2 appearance-none bg-transparent cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-amber-500 [&::-webkit-slider-thumb]:border [&::-webkit-slider-thumb]:border-stone-900"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </GoldBorder>
          </div>
        </div>
        
        <div className="text-center mt-10">
          <GoldButton onClick={savePreferences} className="px-10 py-3 tracking-wider">
            <i className="fas fa-save mr-2"></i> GUARDAR PREFERENCIAS
          </GoldButton>
          <p className="text-stone-400/80 text-sm mt-3 font-light">
            Recomendaremos productos y diseños basados en tus preferencias
          </p>
        </div>
      </div>
    </SpotlightContainer>
  );
};

export default PreferenceManager;
