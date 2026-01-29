"use client";

import { ReactNode, useCallback, useEffect, useRef, useState } from 'react';
import usePersistentState from '../../hooks/usePersistentState';
import { useTheme } from '../../hooks/useTheme';
import { isDarkTheme } from '../../utils/theme';

interface Props {
  open: boolean;
  id?: string;
}

const transitionDurationMs = 200;

const QuickSettings = ({ open, id = 'quick-settings-panel' }: Props) => {
  const { theme: activeTheme, setTheme: updateTheme } = useTheme();
  const [sound, setSound] = usePersistentState('qs-sound', true);
  const [online, setOnline] = usePersistentState('qs-online', true);
  const [reduceMotion, setReduceMotion] = usePersistentState('qs-reduce-motion', false);
  const [focusMode, setFocusMode] = usePersistentState('qs-focus-mode', false);
  const [nightLight, setNightLight] = usePersistentState('qs-night-light', false);
  const [screenRecording, setScreenRecording] = usePersistentState('qs-screen-recording', false);
  const [brightness, setBrightness] = usePersistentState(
    'qs-brightness',
    75,
    (value): value is number =>
      typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 100,
  );
  const [volume, setVolume] = usePersistentState(
    'qs-volume',
    70,
    (value): value is number =>
      typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 100,
  );
  const panelRef = useRef<HTMLDivElement>(null);
  const [shouldRender, setShouldRender] = useState(open);
  const [isVisible, setIsVisible] = useState(open);
  const [lastPowerAction, setLastPowerAction] = useState<string | null>(null);
  const focusableTabIndex = open ? 0 : -1;

  useEffect(() => {
    document.documentElement.toggleAttribute('data-sound-muted', !sound);
  }, [sound]);

  useEffect(() => {
    document.documentElement.toggleAttribute('data-offline', !online);
  }, [online]);

  useEffect(() => {
    document.documentElement.classList.toggle('reduce-motion', reduceMotion);
  }, [reduceMotion]);

  useEffect(() => {
    document.documentElement.toggleAttribute('data-night-light', nightLight);
  }, [nightLight]);

  useEffect(() => {
    document.documentElement.toggleAttribute('data-screen-recording', screenRecording);
  }, [screenRecording]);

  useEffect(() => {
    if (open) {
      setShouldRender(true);
      const raf = requestAnimationFrame(() => setIsVisible(true));
      return () => cancelAnimationFrame(raf);
    }

    setIsVisible(false);
    const timeout = window.setTimeout(() => setShouldRender(false), transitionDurationMs);
    return () => window.clearTimeout(timeout);
  }, [open]);

  useEffect(() => {
    const node = panelRef.current;
    if (!node) return;

    if (open) {
      node.removeAttribute('inert');
    } else {
      node.setAttribute('inert', '');
    }
  }, [open]);

  useEffect(() => {
    if (!open) {
      const activeElement = document.activeElement as HTMLElement | null;
      if (activeElement && panelRef.current?.contains(activeElement)) {
        activeElement.blur();
      }
    }
  }, [open]);

  useEffect(() => {
    document.documentElement.toggleAttribute('data-focus-mode', focusMode);

    return () => {
      document.documentElement.removeAttribute('data-focus-mode');
    };
  }, [focusMode]);

  useEffect(() => {
    document.documentElement.style.setProperty('--qs-brightness', `${brightness}`);

    return () => {
      document.documentElement.style.removeProperty('--qs-brightness');
    };
  }, [brightness]);

  useEffect(() => {
    document.documentElement.style.setProperty('--qs-volume', `${volume}`);

    return () => {
      document.documentElement.style.removeProperty('--qs-volume');
    };
  }, [volume]);

  const handleOpenSettings = useCallback(() => {
    window.dispatchEvent(new CustomEvent('open-app', { detail: 'settings' }));
  }, []);

  const handleScreenRecordingToggle = useCallback(() => {
    setScreenRecording((prev) => {
      const next = !prev;
      if (next) {
        window.dispatchEvent(new CustomEvent('open-app', { detail: 'screen-recorder' }));
      }
      return next;
    });
  }, [setScreenRecording]);

  if (!shouldRender) {
    return null;
  }

  const statusToneStyles: Record<
    'positive' | 'warning' | 'info' | 'muted',
    { icon: string; value: string; ring: string }
  > = {
    positive: {
      icon: 'bg-emerald-400/20 text-emerald-200',
      value: 'text-emerald-100',
      ring: 'shadow-[0_0_0_1px_rgba(16,185,129,0.25)]',
    },
    warning: {
      icon: 'bg-amber-400/20 text-amber-200',
      value: 'text-amber-100',
      ring: 'shadow-[0_0_0_1px_rgba(217,119,6,0.25)]',
    },
    info: {
      icon: 'bg-sky-400/20 text-sky-200',
      value: 'text-sky-100',
      ring: 'shadow-[0_0_0_1px_rgba(14,165,233,0.25)]',
    },
    muted: {
      icon: 'bg-white/10 text-white/70',
      value: 'text-white/70',
      ring: 'shadow-[0_0_0_1px_rgba(148,163,184,0.18)]',
    },
  };

  const isDarkMode = isDarkTheme(activeTheme);
  const quickTheme = isDarkMode ? 'dark' : 'light';

  const statusBadges: Array<{
    id: string;
    label: string;
    value: string;
    icon: ReactNode;
    tone: keyof typeof statusToneStyles;
  }> = [
    {
      id: 'theme',
      label: 'Theme',
      value: isDarkMode ? 'Dark' : 'Light',
      icon: isDarkMode ? <MoonIcon /> : <SunIcon />,
      tone: 'info',
    },
    {
      id: 'audio',
      label: 'Sound',
      value: sound ? 'On' : 'Muted',
      icon: <SoundIcon />,
      tone: sound ? 'positive' : 'muted',
    },
    {
      id: 'network',
      label: 'Network',
      value: online ? 'Online' : 'Offline',
      icon: <NetworkIcon />,
      tone: online ? 'positive' : 'warning',
    },
    {
      id: 'focus',
      label: 'Focus mode',
      value: focusMode ? 'On' : 'Off',
      icon: <FocusIcon />,
      tone: focusMode ? 'info' : 'muted',
    },
    {
      id: 'volume',
      label: 'Volume',
      value: `${volume}%`,
      icon: <VolumeIcon muted={!sound} />,
      tone: sound ? 'info' : 'muted',
    },
    {
      id: 'night-light',
      label: 'Night light',
      value: nightLight ? 'On' : 'Off',
      icon: <NightLightIcon />,
      tone: nightLight ? 'warning' : 'muted',
    },
  ];

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
    {
      id: 'quick-settings-focus-mode',
      label: 'Focus mode',
      description: 'Silence badges and notifications.',
      value: focusMode,
      onToggle: () => setFocusMode(!focusMode),
      accent: 'from-amber-400/30 via-amber-500/10 to-transparent',
      icon: <FocusIcon />,
    },
    {
      id: 'quick-settings-night-light',
      label: 'Night light',
      description: 'Reduce blue light for late sessions.',
      value: nightLight,
      onToggle: () => setNightLight(!nightLight),
      accent: 'from-amber-400/30 via-orange-500/10 to-transparent',
      icon: <NightLightIcon />,
    },
    {
      id: 'quick-settings-screen-recording',
      label: 'Screen recording',
      description: 'Launch the recorder workspace.',
      value: screenRecording,
      onToggle: handleScreenRecordingToggle,
      accent: 'from-rose-400/30 via-rose-500/10 to-transparent',
      icon: <RecordIcon />,
    },
  ];

  const sliderControls: Array<{
    id: string;
    label: string;
    value: number;
    description: string;
    onChange: (value: number) => void;
    icon: ReactNode;
    accent: string;
    unit?: string;
    ariaValueText?: string;
    disabled?: boolean;
  }> = [
    {
      id: 'quick-settings-brightness',
      label: 'Brightness',
      description: 'Tune the simulated display glow.',
      value: brightness,
      onChange: (value) => setBrightness(Math.min(100, Math.max(0, value))),
      icon: <SunIcon />,
      accent: 'from-sky-400 via-sky-500 to-transparent',
      unit: '%',
      ariaValueText: `${brightness}% brightness`,
    },
    {
      id: 'quick-settings-volume',
      label: 'Master volume',
      description: sound ? 'Adjust feedback alerts.' : 'Sound is muted — enable it above to hear alerts.',
      value: volume,
      onChange: (value) => setVolume(Math.min(100, Math.max(0, value))),
      icon: <VolumeIcon muted={!sound} />,
      accent: sound
        ? 'from-emerald-400 via-emerald-500 to-transparent'
        : 'from-slate-400 via-slate-500 to-transparent',
      unit: '%',
      ariaValueText: sound ? `${volume}% volume` : 'Muted',
      disabled: !sound,
    },
  ];

  return (
    <div
      id={id}
      ref={panelRef}
      role="menu"
      aria-label="Quick settings"
      aria-hidden={!open}
      className={`group/qs absolute top-9 right-3 w-[17.5rem] origin-top-right rounded-xl border border-white/10 bg-slate-950/90 p-4 text-xs text-slate-100 shadow-[0_24px_48px_-28px_rgba(15,23,42,0.9)] backdrop-blur-lg transition-all duration-200 focus:outline-none max-h-[min(38rem,calc(100vh-4.5rem))] overflow-y-auto overscroll-contain ${
        isVisible
          ? 'pointer-events-auto translate-y-0 scale-100 opacity-100'
          : 'pointer-events-none -translate-y-2 scale-95 opacity-0'
      }`}
    >
      <div className="pb-3">
        <button
          type="button"
          onClick={handleOpenSettings}
          className="flex w-full items-center justify-between gap-2 text-left text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-300 transition hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-kali-focus"
          aria-label="Open system preferences"
        >
          Quick settings
          <span className="rounded-full border border-white/10 bg-white/10 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[0.26em] text-slate-200">
            System preferences
          </span>
        </button>
        <p className="mt-2 text-[11px] leading-snug text-slate-400">
          Personalize key desktop controls in one tidy panel.
        </p>
      </div>

      <section aria-label="System snapshot" className="rounded-lg border border-white/10 bg-white/5 p-3">
        <div className="flex items-center justify-between gap-2">
          <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-200">Status</span>
          <span className="text-[10px] uppercase tracking-[0.24em] text-slate-400">Live</span>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2" aria-live="polite">
          {statusBadges.map(({ id, label, value, icon, tone }) => {
            const toneStyle = statusToneStyles[tone];
            return (
              <span
                key={id}
                className={`inline-flex items-center gap-2 rounded-lg border border-white/10 bg-slate-900/80 px-2.5 py-2 text-[11px] font-medium text-slate-200 ${toneStyle.ring}`}
              >
                <span
                  className={`flex h-6 w-6 items-center justify-center rounded-md ${toneStyle.icon}`}
                  aria-hidden
                >
                  <span className="scale-75">{icon}</span>
                </span>
                <span className="flex flex-col leading-tight">
                  <span className="uppercase tracking-wide text-slate-400">{label}</span>
                  <span className={`font-semibold ${toneStyle.value}`}>{value}</span>
                </span>
              </span>
            );
          })}
        </div>
      </section>

      <section aria-label="Appearance" className="mt-3 rounded-lg border border-white/10 bg-white/5 p-3">
        <div className="flex items-center justify-between gap-2">
          <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-200">Theme</span>
          <span className="inline-flex items-center gap-1 rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-medium uppercase tracking-[0.22em] text-slate-200">
            <span
              className={`h-1.5 w-1.5 rounded-full ${quickTheme === 'light' ? 'bg-amber-300' : 'bg-blue-400'}`}
              aria-hidden
            />
            {quickTheme === 'light' ? 'Light mode' : 'Dark mode'}
          </span>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2" role="group" aria-label="Theme options">
          {[
            { option: 'light', label: 'Light', icon: <SunIcon /> },
            { option: 'dark', label: 'Dark', icon: <MoonIcon /> },
          ].map(({ option, label, icon }) => {
            const isActive = quickTheme === option;
            return (
              <button
                key={option}
                type="button"
                role="menuitemradio"
                aria-checked={isActive}
                className={`flex items-center justify-center gap-2 rounded-lg border border-white/10 px-3 py-2 text-sm font-medium capitalize transition-all focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-kali-focus ${
                  isActive
                    ? 'bg-kali-control text-slate-900 shadow-[0_0_0_1px_rgba(15,23,42,0.18)]'
                    : 'bg-slate-900/80 text-slate-200 hover:bg-slate-800'
                }`}
                onClick={() => updateTheme(option === 'light' ? 'default' : 'dark')}
                tabIndex={focusableTabIndex}
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

      <section aria-label="Power menu" className="mt-3 rounded-lg border border-white/10 bg-white/5 p-3">
        <div className="flex items-center justify-between gap-2">
          <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-200">Power</span>
          <span className="text-[10px] uppercase tracking-[0.24em] text-slate-400">Simulated</span>
        </div>
        <div className="mt-3 grid gap-2">
          {[
            { id: 'lock', label: 'Lock', description: 'Secure the desktop session.' },
            { id: 'logout', label: 'Logout', description: 'Return to the login screen.' },
            { id: 'shutdown', label: 'Shutdown', description: 'Power down the session.' },
          ].map((action) => (
            <button
              key={action.id}
              type="button"
              onClick={() => setLastPowerAction(action.label)}
              className="flex items-center justify-between rounded-lg border border-white/10 bg-slate-900/80 px-3 py-2 text-left text-[11px] text-slate-200 transition hover:border-white/20 hover:bg-slate-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-kali-focus"
              tabIndex={focusableTabIndex}
            >
              <span className="flex flex-col">
                <span className="font-semibold uppercase tracking-[0.2em]">{action.label}</span>
                <span className="text-[10px] text-slate-400">{action.description}</span>
              </span>
              <span className="rounded-full border border-white/10 bg-white/10 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[0.2em] text-slate-300">
                Demo
              </span>
            </button>
          ))}
        </div>
        {lastPowerAction && (
          <p className="mt-3 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-[10px] uppercase tracking-[0.22em] text-slate-300">
            {lastPowerAction} queued — simulation only
          </p>
        )}
      </section>

      <section aria-label="Device controls" className="mt-3 space-y-3 rounded-lg border border-white/10 bg-white/5 p-3">
        <div className="flex items-center justify-between gap-2">
          <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-200">Device</span>
          <span className="text-[10px] uppercase tracking-[0.24em] text-slate-400">Fine tune</span>
        </div>
        <div className="space-y-3">
          {sliderControls.map(
            ({
              id,
              label,
              description,
              value,
              onChange,
              icon,
              accent,
              unit = '',
              ariaValueText,
              disabled,
            }) => {
              const labelId = `${id}-label`;
              const descriptionId = `${id}-description`;
              return (
                <div
                  key={id}
                  className={`group flex items-start gap-3 rounded-lg border border-white/10 bg-slate-900/70 p-3 transition duration-150 hover:border-white/20 hover:bg-slate-800 ${
                    disabled ? 'opacity-60' : ''
                  }`}
                  aria-disabled={disabled}
                >
                  <span className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/10 text-slate-200">
                    <span
                      className={`absolute inset-0 rounded-lg bg-gradient-to-br ${accent} opacity-0 transition-opacity duration-200 group-hover:opacity-100`}
                      aria-hidden
                    />
                    <span className="relative text-base" aria-hidden>
                      {icon}
                    </span>
                  </span>
                  <div className="flex-1">
                    <div className="flex items-center justify-between gap-2 text-[11px] text-slate-300">
                      <div className="flex flex-col">
                        <span id={labelId} className="font-semibold text-slate-100">
                          {label}
                        </span>
                        <span id={descriptionId}>{description}</span>
                      </div>
                      <span className="font-semibold text-slate-200">
                        {value}
                        {unit}
                      </span>
                    </div>
                    <div className="relative mt-2 h-1.5 w-full overflow-hidden rounded-full bg-white/[0.2]">
                      <div
                        className={`absolute inset-y-0 left-0 rounded-full bg-gradient-to-r ${
                          disabled
                            ? 'from-white/60 via-white/30 to-transparent'
                            : 'from-sky-300 via-sky-200/80 to-transparent'
                        }`}
                        style={{ width: `${value}%` }}
                        aria-hidden
                      />
                      <input
                        id={id}
                        type="range"
                        min={0}
                        max={100}
                        value={value}
                        onChange={(event) => onChange(Number(event.target.value))}
                        className="relative h-1.5 w-full cursor-pointer appearance-none bg-transparent focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-kali-focus"
                        tabIndex={focusableTabIndex}
                        aria-valuemin={0}
                        aria-valuemax={100}
                        aria-valuenow={value}
                        aria-valuetext={ariaValueText}
                        aria-labelledby={labelId}
                        aria-describedby={descriptionId}
                        disabled={disabled}
                      />
                    </div>
                  </div>
                </div>
              );
            },
          )}
        </div>
      </section>

      <div className="mt-3 space-y-2" role="none">
        {toggles.map(({ id, label, description, value, onToggle, icon, accent }) => {
          const labelId = `${id}-label`;
          const descriptionId = `${id}-description`;
          return (
            <div
              key={id}
              role="presentation"
              className="group flex items-center justify-between gap-3 rounded-lg border border-white/10 bg-slate-900/70 px-3 py-3 transition duration-150 hover:border-white/20 hover:bg-slate-800 focus-within:border-white/20 focus-within:bg-slate-800"
            >
              <div className="flex items-start gap-3">
                <span className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/10 text-slate-200">
                  <span
                    className={`absolute inset-0 rounded-lg bg-gradient-to-br ${accent} opacity-0 transition-opacity duration-200 group-hover:opacity-100 group-focus-within:opacity-100`}
                    aria-hidden
                  />
                  <span className="relative text-base" aria-hidden>
                    {icon}
                  </span>
                </span>
                <label htmlFor={id} className="flex flex-col">
                  <span id={labelId} className="font-semibold text-slate-100">
                    {label}
                  </span>
                  <span id={descriptionId} className="text-xs text-slate-300">
                    {description}
                  </span>
                </label>
              </div>
              <div className="flex flex-col items-end gap-1">
                <span
                  aria-hidden
                  className={`inline-flex items-center rounded-full border border-white/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${
                    value ? 'bg-kali-control text-slate-900' : 'bg-white/10 text-slate-300'
                  }`}
                >
                  {value ? 'On' : 'Off'}
                </span>
                <button
                  id={id}
                  type="button"
                  role="switch"
                  aria-checked={value}
                  aria-labelledby={labelId}
                  aria-describedby={descriptionId}
                  className={`relative inline-flex h-6 w-12 shrink-0 items-center rounded-full border border-white/10 transition-all focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-kali-focus ${
                    value
                      ? 'bg-kali-control shadow-[0_10px_24px_-12px_rgba(56,189,248,0.85)]'
                      : 'bg-slate-800'
                  }`}
                  onClick={onToggle}
                  tabIndex={focusableTabIndex}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform duration-150 ${
                      value ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
            </div>
          );
        })}
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

const FocusIcon = () => (
  <svg
    width="18"
    height="18"
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className="text-white"
  >
    <path
      d="M4 12H2m10-8V2m8 10h2m-10 8v2M7 12a5 5 0 1 0 10 0 5 5 0 0 0-10 0Z"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const VolumeIcon = ({ muted }: { muted: boolean }) => (
  <svg
    width="18"
    height="18"
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className="text-white"
  >
    <path
      d="M6 9.5v5h2.5l3.5 3V6.5l-3.5 3H6Z"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    {muted ? (
      <path
        d="m16 15 3 3m0-3-3 3"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    ) : (
      <path
        d="M16.5 9a3 3 0 0 1 0 6M18.5 6a6 6 0 0 1 0 12"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    )}
  </svg>
);

const NightLightIcon = () => (
  <svg
    width="18"
    height="18"
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className="text-white"
  >
    <path
      d="M14.5 3.5a8.5 8.5 0 1 0 6 14.5 7 7 0 0 1-6-14.5Z"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M6.5 17.5c1.5-1.2 3.5-1.8 5.5-1.8"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const RecordIcon = () => (
  <svg
    width="18"
    height="18"
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className="text-white"
  >
    <rect
      x="3.5"
      y="5.5"
      width="17"
      height="13"
      rx="2"
      stroke="currentColor"
      strokeWidth="1.5"
    />
    <circle cx="8" cy="10" r="2" fill="currentColor" />
    <path
      d="M14.5 9.5h4v5h-4z"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinejoin="round"
    />
  </svg>
);

export default QuickSettings;
