"use client";

import { useEffect, ReactNode } from 'react';
import usePersistentState from '../../hooks/usePersistentState';

interface Props {
  open: boolean;
  onReplayTour?: () => void;
  tourActive?: boolean;
}

const QuickSettings = ({ open, onReplayTour, tourActive }: Props) => {
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

  const toggles: Array<{
    id: string;
    label: string;
    description: string;
    value: boolean;
    onToggle: () => void;
    icon: ReactNode;
    accent: string;
  }> = [
    {
      id: 'quick-settings-sound',
      label: 'Sound',
      description: 'Play system alerts and feedback.',
      value: sound,
      onToggle: () => setSound(!sound),
      accent: 'from-sky-400/30 via-sky-500/10 to-transparent',
      icon: <SoundIcon />,
    },
    {
      id: 'quick-settings-network',
      label: 'Network',
      description: 'Keep simulated network online.',
      value: online,
      onToggle: () => setOnline(!online),
      accent: 'from-emerald-400/30 via-emerald-500/10 to-transparent',
      icon: <NetworkIcon />,
    },
    {
      id: 'quick-settings-reduced-motion',
      label: 'Reduced motion',
      description: 'Limit animations for accessibility.',
      value: reduceMotion,
      onToggle: () => setReduceMotion(!reduceMotion),
      accent: 'from-purple-400/30 via-purple-500/10 to-transparent',
      icon: <MotionIcon />,
    },
  ];

  const replayDisabled = !onReplayTour || Boolean(tourActive);

  return (
    <div
      role="menu"
      aria-label="Quick settings"
      aria-hidden={!open}
      className={`group/qs absolute top-9 right-3 w-[19rem] origin-top-right rounded-2xl border border-white/10 bg-kali-surface/90 p-4 text-sm text-white shadow-kali-panel backdrop-blur-lg transition-all duration-200 focus:outline-none ${
        open
          ? 'pointer-events-auto translate-y-0 scale-100 opacity-100'
          : 'pointer-events-none -translate-y-2 scale-95 opacity-0'
      }`}
      style={{
        boxShadow:
          '0 20px 45px -35px rgba(40,120,255,0.65), inset 0 0 0 1px rgba(255,255,255,0.06)',
      }}
    >
      <div className="pointer-events-none absolute inset-0 -z-10 rounded-[inherit] bg-[radial-gradient(140%_120%_at_50%_-10%,rgba(80,157,255,0.32),rgba(25,48,108,0.12)_45%,transparent)] opacity-90" />

      <div className="pb-3">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-kali-muted">Quick settings</p>
        <p className="mt-1 text-xs text-white/70">Personalise the desktop in one place.</p>
      </div>

      <section aria-label="Appearance" className="rounded-xl border border-white/10 bg-white/5 p-3 shadow-inner">
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs font-semibold uppercase tracking-wide text-white/80">Theme</span>
          <span className="inline-flex items-center gap-1 rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-white/80">
            <span className="h-1.5 w-1.5 rounded-full bg-white/70" aria-hidden />
            {theme === 'light' ? 'Light mode' : 'Dark mode'}
          </span>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2" role="group" aria-label="Theme options">
          {[
            { option: 'light', label: 'Light', icon: <SunIcon /> },
            { option: 'dark', label: 'Dark', icon: <MoonIcon /> },
          ].map(({ option, label, icon }) => {
            const isActive = theme === option;
            return (
              <button
                key={option}
                type="button"
                role="menuitemradio"
                aria-checked={isActive}
                className={`flex items-center justify-center gap-2 rounded-lg border border-white/10 px-3 py-2 text-sm font-medium capitalize transition-all focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-kali-focus ${
                  isActive
                    ? 'bg-kali-control text-black shadow-[0_0_0_1px_rgba(255,255,255,0.25)]'
                    : 'bg-white/10 text-white hover:bg-white/20'
                }`}
                onClick={() => setTheme(option)}
              >
                <span className="text-lg" aria-hidden>
                  {icon}
                </span>
                {label}
              </button>
            );
          })}
        </div>
      </section>

      <div className="mt-4 space-y-2" role="none">
        {toggles.map(({ id, label, description, value, onToggle, icon, accent }) => (
          <div
            key={id}
            role="menuitem"
            className="group flex items-center justify-between gap-3 rounded-xl border border-white/5 bg-white/5 px-3 py-3 transition duration-150 hover:border-white/15 hover:bg-white/10 focus-within:border-white/15 focus-within:bg-white/10"
          >
            <div className="flex items-start gap-3">
              <span className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/10 text-white/80">
                <span
                  className={`absolute inset-0 rounded-xl bg-gradient-to-br ${accent} opacity-0 transition-opacity duration-200 group-hover:opacity-100 group-focus-within:opacity-100`}
                  aria-hidden
                />
                <span className="relative text-lg" aria-hidden>
                  {icon}
                </span>
              </span>
              <label htmlFor={id} className="flex flex-col">
                <span className="font-semibold text-white">{label}</span>
                <span className="text-xs text-white/70">{description}</span>
              </label>
            </div>
            <div className="flex flex-col items-end gap-1">
              <span
                aria-hidden
                className={`inline-flex items-center rounded-full border border-white/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${
                  value ? 'bg-kali-control text-black' : 'bg-white/10 text-white/70'
                }`}
              >
                {value ? 'On' : 'Off'}
              </span>
              <button
                id={id}
                type="button"
                role="switch"
                aria-checked={value}
                aria-label={label}
                className={`relative inline-flex h-6 w-12 shrink-0 items-center rounded-full border border-white/10 transition-all focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-kali-focus ${
                  value ? 'bg-kali-control shadow-[0_0_15px_rgba(120,190,255,0.45)]' : 'bg-white/20'
                }`}
                onClick={onToggle}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform duration-150 ${
                    value ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-4 rounded-xl border border-white/10 bg-white/5 p-3">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/80">Desktop tour</p>
            <p className="text-xs text-white/70">Replay the guided overview whenever you need a refresher.</p>
          </div>
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              if (replayDisabled) return;
              onReplayTour?.();
            }}
            disabled={replayDisabled}
            className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-kali-focus ${
              replayDisabled
                ? 'cursor-not-allowed border border-white/10 bg-white/10 text-white/50'
                : 'border border-white/30 bg-white/90 text-slate-900 hover:bg-white'
            }`}
          >
            Replay desktop tour
          </button>
        </div>
        {tourActive && (
          <p className="mt-2 text-[11px] text-white/60">The tour is already running.</p>
        )}
      </div>
    </div>
  );
};

const SunIcon = () => (
  <svg
    width="18"
    height="18"
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className="text-white"
  >
    <path
      d="M12 4.5V2M12 22v-2.5M5.64 5.64 4.22 4.22M19.78 19.78l-1.42-1.42M4.5 12H2M22 12h-2.5M5.64 18.36 4.22 19.78M19.78 4.22 18.36 5.64M12 16.5a4.5 4.5 0 1 0 0-9 4.5 4.5 0 0 0 0 9Z"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const MoonIcon = () => (
  <svg
    width="18"
    height="18"
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className="text-white"
  >
    <path
      d="M20.5 15.5A8.5 8.5 0 0 1 8.5 3.5 7 7 0 1 0 20.5 15.5Z"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const SoundIcon = () => (
  <svg
    width="18"
    height="18"
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className="text-white"
  >
    <path
      d="M5.5 9.5v5H8l4 3V6.5l-4 3H5.5ZM16.5 9a3 3 0 0 1 0 6M18.5 6a6 6 0 0 1 0 12"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const NetworkIcon = () => (
  <svg
    width="18"
    height="18"
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className="text-white"
  >
    <path
      d="M4 18.5a12 12 0 0 1 16 0M7.5 14a7 7 0 0 1 9 0M10.5 9.5a3 3 0 0 1 3 0"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <circle cx="12" cy="6" r="1.5" fill="currentColor" />
  </svg>
);

const MotionIcon = () => (
  <svg
    width="18"
    height="18"
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className="text-white"
  >
    <path
      d="M5 12h3l2 8 4-16 2 8h3"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

export default QuickSettings;
