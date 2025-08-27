import React, { createContext, useContext, useEffect } from 'react';
import usePersistedState from '../../../../../hooks/usePersistedState';

type Settings = {
  colorBlind: boolean;
  setColorBlind: (v: boolean) => void;
  highContrast: boolean;
  setHighContrast: (v: boolean) => void;
  reduceMotion: boolean;
  setReduceMotion: (v: boolean) => void;
  textScale: number;
  setTextScale: (v: number) => void;
};

const GameSettingsContext = createContext<Settings | undefined>(undefined);

export const GameSettingsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [colorBlind, setColorBlind] = usePersistedState('settings:colorBlind', false);
  const [highContrast, setHighContrast] = usePersistedState('settings:highContrast', false);
  const [reduceMotion, setReduceMotion] = usePersistedState('settings:reduceMotion', () => {
    if (typeof window !== 'undefined' && window.matchMedia) {
      return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    }
    return false;
  });
  const [textScale, setTextScale] = usePersistedState('settings:textScale', 1);

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const handler = () => setReduceMotion(mq.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, [setReduceMotion]);

  useEffect(() => {
    if (typeof document === 'undefined') return;
    const root = document.documentElement;
    root.classList.toggle('colorblind', colorBlind);
    root.classList.toggle('high-contrast', highContrast);
    root.classList.toggle('reduce-motion', reduceMotion);
    root.style.setProperty('--game-text-scale', String(textScale));
  }, [colorBlind, highContrast, reduceMotion, textScale]);

  return (
    <GameSettingsContext.Provider
      value={{
        colorBlind,
        setColorBlind,
        highContrast,
        setHighContrast,
        reduceMotion,
        setReduceMotion,
        textScale,
        setTextScale,
      }}
    >
      {children}
    </GameSettingsContext.Provider>
  );
};

export const useGameSettings = () => {
  const ctx = useContext(GameSettingsContext);
  if (!ctx) throw new Error('useGameSettings must be used within GameSettingsProvider');
  return ctx;
};

export default GameSettingsContext;
