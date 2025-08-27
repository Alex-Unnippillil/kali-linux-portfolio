import React, { createContext, useContext } from 'react';
import usePersistedState from '../../hooks/usePersistedState';

interface Settings {
  difficulty: string;
  setDifficulty: (d: string) => void;
  assists: boolean;
  setAssists: (v: boolean) => void;
  colorBlind: boolean;
  setColorBlind: (v: boolean) => void;
  highContrast: boolean;
  setHighContrast: (v: boolean) => void;
  quality: number;
  setQuality: (v: number) => void;
}

const SettingsContext = createContext<Settings | undefined>(undefined);

export const SettingsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [difficulty, setDifficulty] = usePersistedState('settings:difficulty', 'normal');
  const [assists, setAssists] = usePersistedState('settings:assists', true);
  const [colorBlind, setColorBlind] = usePersistedState('settings:colorBlind', false);
  const [highContrast, setHighContrast] = usePersistedState('settings:highContrast', false);
  const [quality, setQuality] = usePersistedState('settings:quality', 1);

  return (
    <SettingsContext.Provider
      value={{
        difficulty,
        setDifficulty,
        assists,
        setAssists,
        colorBlind,
        setColorBlind,
        highContrast,
        setHighContrast,
        quality,
        setQuality,
      }}
    >
      {children}
    </SettingsContext.Provider>
  );
};

export const useSettings = () => {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error('useSettings must be used within SettingsProvider');
  return ctx;
};

export default SettingsContext;
