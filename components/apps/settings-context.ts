import React, { createContext, useContext, useState, useEffect } from 'react';

export type GameSettings = {
  theme: string;
  setTheme: (theme: string) => void;
  sound: boolean;
  setSound: (value: boolean) => void;
  difficulty: string;
  setDifficulty: (value: string) => void;
};

function usePersistentState<T>(key: string, defaultValue: T): [T, React.Dispatch<React.SetStateAction<T>>] {
  const [state, setState] = useState<T>(() => {
    if (typeof window !== 'undefined') {
      const stored = window.localStorage.getItem(key);
      if (stored !== null) {
        try {
          return JSON.parse(stored);
        } catch {
          return stored as unknown as T;
        }
      }
    }
    return defaultValue;
  });

  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(key, JSON.stringify(state));
    }
  }, [key, state]);

  return [state, setState];
}

const GameSettingsContext = createContext<GameSettings | undefined>(undefined);

export const GameSettingsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setTheme] = usePersistentState('game-theme', 'tech');
  const [sound, setSound] = usePersistentState('game-sound', true);
  const [difficulty, setDifficulty] = usePersistentState('game-difficulty', 'easy');

  const value: GameSettings = { theme, setTheme, sound, setSound, difficulty, setDifficulty };

  return <GameSettingsContext.Provider value={value}>{children}</GameSettingsContext.Provider>;
};

export const useGameSettings = () => {
  const ctx = useContext(GameSettingsContext);
  if (!ctx) throw new Error('useGameSettings must be used within GameSettingsProvider');
  return ctx;
};

export { usePersistentState };

