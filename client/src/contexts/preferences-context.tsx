import { createContext, useContext, useState, ReactNode } from 'react';

interface Occasion {
  name: string;
  priority: number;
}

interface UserPreferences {
  styles: string[];
  occasions: Occasion[];
  seasons?: string[];
}

interface PreferencesContextType {
  preferences: UserPreferences;
  updatePreferences: (newPreferences: Partial<UserPreferences>) => void;
}

const defaultPreferences: UserPreferences = {
  styles: ['Casual Chic', 'Business'],
  occasions: [
    { name: 'Work', priority: 0.75 },
    { name: 'Social Events', priority: 0.5 },
    { name: 'Travel', priority: 0.25 },
    { name: 'Special Events', priority: 0.5 },
  ],
  seasons: ['Summer', 'Fall'],
};

const PreferencesContext = createContext<PreferencesContextType | undefined>(undefined);

export const PreferencesProvider = ({ children }: { children: ReactNode }) => {
  const [preferences, setPreferences] = useState<UserPreferences>(defaultPreferences);

  const updatePreferences = (newPreferences: Partial<UserPreferences>) => {
    setPreferences(prev => ({
      ...prev,
      ...newPreferences,
    }));
  };

  return (
    <PreferencesContext.Provider
      value={{
        preferences,
        updatePreferences,
      }}
    >
      {children}
    </PreferencesContext.Provider>
  );
};

export const usePreferences = () => {
  const context = useContext(PreferencesContext);
  if (context === undefined) {
    throw new Error('usePreferences must be used within a PreferencesProvider');
  }
  return context;
};
