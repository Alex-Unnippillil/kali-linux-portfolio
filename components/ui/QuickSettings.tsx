"use client";

import usePersistentState from '../../hooks/usePersistentState';
import { useEffect } from 'react';

interface Props {
  open: boolean;
}

const QuickSettings = ({ open }: Props) => {
  const [theme, setTheme] = usePersistentState('qs-theme', 'light');
  const [sound, setSound] = usePersistentState('qs-sound', true);
  const [online, setOnline] = usePersistentState('qs-online', true);
  const [reduceMotion, setReduceMotion] = usePersistentState('qs-reduce-motion', false);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
  }, [theme]);

  useEffect(() => {
    document.documentElement.classList.toggle('reduce-motion', reduceMotion);
  }, [reduceMotion]);

  const toggles = [
    {
      id: 'quick-settings-sound',
      label: 'Sound',
      description: 'Play system alerts and feedback.',
      value: sound,
      onToggle: () => setSound(!sound),
    },
    {
      id: 'quick-settings-network',
      label: 'Network',
      description: 'Keep simulated network online.',
      value: online,
      onToggle: () => setOnline(!online),
    },
    {
      id: 'quick-settings-reduced-motion',
      label: 'Reduced motion',
      description: 'Limit animations for accessibility.',
      value: reduceMotion,
      onToggle: () => setReduceMotion(!reduceMotion),
    },
  ];

  return (
    <div
      role="menu"
      aria-label="Quick settings"
      aria-hidden={!open}
      className={`absolute top-9 right-3 w-72 origin-top-right rounded-xl border border-white/10 bg-kali-surface/95 p-4 text-sm text-white shadow-kali-panel backdrop-blur transition-all duration-150 focus:outline-none ${
        open
          ? 'pointer-events-auto translate-y-0 scale-100 opacity-100'
          : 'pointer-events-none -translate-y-2 scale-95 opacity-0'
      }`}
    >
      <div className="pb-3">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-kali-muted">Quick settings</p>
        <p className="mt-1 text-xs text-white/60">Personalise the desktop in one place.</p>
      </div>

      <section aria-label="Appearance" className="rounded-lg bg-white/5 p-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wide text-white/70">Theme</span>
          <span className="text-xs text-white/50">{theme === 'light' ? 'Light' : 'Dark'} mode</span>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2" role="group" aria-label="Theme options">
          {['light', 'dark'].map((option) => {
            const isActive = theme === option;
            return (
              <button
                key={option}
                type="button"
                role="menuitemradio"
                aria-checked={isActive}
                className={`flex items-center justify-center rounded-md border border-white/10 px-3 py-2 text-sm font-medium capitalize transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-kali-focus ${
                  isActive
                    ? 'bg-kali-control text-black shadow-inner'
                    : 'bg-white/5 text-white hover:bg-white/10'
                }`}
                onClick={() => setTheme(option)}
              >
                {option}
              </button>
            );
          })}
        </div>
      </section>

      <div className="mt-4 space-y-2" role="none">
        {toggles.map(({ id, label, description, value, onToggle }) => (
          <div
            key={id}
            role="menuitem"
            className="flex items-center justify-between gap-4 rounded-lg px-3 py-2 transition hover:bg-white/5 focus-within:bg-white/5"
          >
            <label htmlFor={id} className="flex flex-col">
              <span className="font-medium text-white">{label}</span>
              <span className="text-xs text-white/60">{description}</span>
            </label>
            <button
              id={id}
              type="button"
              role="switch"
              aria-checked={value}
              aria-label={label}
              className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full border border-white/10 transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-kali-focus ${
                value ? 'bg-kali-control' : 'bg-white/20'
              }`}
              onClick={onToggle}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition ${
                  value ? 'translate-x-5' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default QuickSettings;
