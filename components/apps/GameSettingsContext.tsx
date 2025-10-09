import React, { createContext, useContext } from 'react';
import usePersistentState from '../../hooks/usePersistentState';

type Difficulty = 'easy' | 'normal' | 'hard';
type PaletteName = 'default' | 'protanopia' | 'deuteranopia' | 'tritanopia';

interface Settings {
  difficulty: Difficulty;
  setDifficulty: (d: Difficulty) => void;
  assists: boolean;
  setAssists: (v: boolean) => void;
  palette: PaletteName;
  setPalette: (v: PaletteName) => void;
  highContrast: boolean;
  setHighContrast: (v: boolean) => void;
  quality: number;
  setQuality: (v: number) => void;
}

const SettingsContext = createContext<Settings | undefined>(undefined);

export const SettingsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [difficulty, setDifficulty] = usePersistentState<Difficulty>('settings:difficulty', 'normal');
  const [assists, setAssists] = usePersistentState('settings:assists', true);
  const [palette, setPalette] = usePersistentState<PaletteName>(
    'settings:palette',
    'default',
  );
  const [highContrast, setHighContrast] = usePersistentState('settings:highContrast', false);
  const [quality, setQuality] = usePersistentState('settings:quality', 1);

  return (
    <SettingsContext.Provider
      value={{
        difficulty,
        setDifficulty,
        assists,
        setAssists,
        palette,
        setPalette,
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
