"use client";

import usePersistentState from '../../hooks/usePersistentState';
import { useEffect } from 'react';

type IconDensity = 'small' | 'medium' | 'large';

const ICON_DENSITY_STORAGE_KEY = 'desktop-icon-density';

const isValidDensity = (value: unknown): value is IconDensity =>
  value === 'small' || value === 'medium' || value === 'large';

const getDefaultDensity = (): IconDensity => {
  if (typeof window !== 'undefined' && typeof window.matchMedia === 'function') {
    return window.matchMedia('(pointer: coarse)').matches ? 'large' : 'medium';
  }
  return 'medium';
};

interface Props {
  open: boolean;
}

const QuickSettings = ({ open }: Props) => {
  const [theme, setTheme] = usePersistentState('qs-theme', 'light');
  const [sound, setSound] = usePersistentState('qs-sound', true);
  const [online, setOnline] = usePersistentState('qs-online', true);
  const [reduceMotion, setReduceMotion] = usePersistentState('qs-reduce-motion', false);
  const [density, setDensity] = usePersistentState<IconDensity>(
    ICON_DENSITY_STORAGE_KEY,
    getDefaultDensity,
    isValidDensity,
  );

  const densityOptions: { value: IconDensity; label: string }[] = [
    { value: 'small', label: 'Small' },
    { value: 'medium', label: 'Medium' },
    { value: 'large', label: 'Large' },
  ];

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
  }, [theme]);

  useEffect(() => {
    document.documentElement.classList.toggle('reduce-motion', reduceMotion);
  }, [reduceMotion]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.dispatchEvent(
      new CustomEvent('desktop-density-change', {
        detail: { density },
      }),
    );
  }, [density]);

  const handleDensitySelect = (value: IconDensity) => {
    if (density === value) return;
    setDensity(value);
  };

  return (
    <div
      className={`absolute bg-ub-cool-grey rounded-md py-4 top-9 right-3 shadow border-black border border-opacity-20 ${
        open ? '' : 'hidden'
      }`}
    >
      <div className="px-4 pb-2">
        <button
          className="w-full flex justify-between"
          onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
        >
          <span>Theme</span>
          <span>{theme === 'light' ? 'Light' : 'Dark'}</span>
        </button>
      </div>
      <div className="px-4 pb-2 flex justify-between">
        <span>Sound</span>
        <input type="checkbox" checked={sound} onChange={() => setSound(!sound)} />
      </div>
      <div className="px-4 pb-2 flex justify-between">
        <span>Network</span>
        <input type="checkbox" checked={online} onChange={() => setOnline(!online)} />
      </div>
      <div className="px-4 flex justify-between">
        <span>Reduced motion</span>
        <input
          type="checkbox"
          checked={reduceMotion}
          onChange={() => setReduceMotion(!reduceMotion)}
        />
      </div>
      <div className="mt-3 border-t border-white/10 px-4 pt-3">
        <span className="mb-2 block text-xs font-semibold uppercase tracking-wide text-white/60">
          Icon density
        </span>
        <div className="flex gap-2">
          {densityOptions.map((option) => {
            const isActive = density === option.value;
            return (
              <button
                key={option.value}
                type="button"
                aria-pressed={isActive}
                onClick={() => handleDensitySelect(option.value)}
                className={`rounded-md px-3 py-1 text-xs font-medium transition focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300 ${
                  isActive
                    ? 'bg-white/20 text-white shadow-inner'
                    : 'border border-white/10 bg-white/5 text-white/80 hover:bg-white/10'
                }`}
              >
                {option.label}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default QuickSettings;
