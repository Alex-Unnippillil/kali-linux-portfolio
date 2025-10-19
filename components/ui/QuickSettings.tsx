"use client";

import { ReactNode, useEffect, useRef, useState } from 'react';
import usePersistentState from '../../hooks/usePersistentState';
import { useSettings } from '../../hooks/useSettings';
import ThemeSwitcher, { THEME_LABELS } from './ThemeSwitcher';

interface Props {
  open: boolean;
}

const transitionDurationMs = 200;

const QuickSettings = ({ open }: Props) => {
  const [sound, setSound] = usePersistentState('qs-sound', true);
  const [online, setOnline] = usePersistentState('qs-online', true);
  const [reduceMotion, setReduceMotion] = usePersistentState('qs-reduce-motion', false);
  const [focusMode, setFocusMode] = usePersistentState('qs-focus-mode', false);
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
  const focusableTabIndex = open ? 0 : -1;
  const { theme } = useSettings();

  useEffect(() => {
    document.documentElement.classList.toggle('reduce-motion', reduceMotion);
  }, [reduceMotion]);

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

  if (!shouldRender) {
    return null;
  }

  const themeDisplayName =
    THEME_LABELS[theme] ?? (typeof theme === 'string' ? `${theme.charAt(0).toUpperCase()}${theme.slice(1)}` : 'Default');

  const statusBadges = [
    { id: 'theme', label: 'Theme', value: themeDisplayName },
    { id: 'audio', label: 'Sound', value: sound ? 'On' : 'Muted' },
    { id: 'network', label: 'Network', value: online ? 'Online' : 'Offline' },
    { id: 'focus', label: 'Focus mode', value: focusMode ? 'On' : 'Off' },
    { id: 'volume', label: 'Volume', value: `${volume}%` },
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
      ref={panelRef}
      role="menu"
      aria-label="Quick settings"
      aria-hidden={!open}
      className={`group/qs absolute top-9 right-3 w-[19rem] origin-top-right rounded-2xl border bg-kali-surface/95 p-4 text-sm shadow-kali-panel backdrop-blur-lg transition-all duration-200 focus:outline-none ${
        isVisible
          ? 'pointer-events-auto translate-y-0 scale-100 opacity-100'
          : 'pointer-events-none -translate-y-2 scale-95 opacity-0'
      }`}
      style={{
        boxShadow:
          '0 20px 45px -35px rgba(40,120,255,0.65), inset 0 0 0 1px rgba(255,255,255,0.06)',
        color: 'var(--kali-text)',
        borderColor: 'color-mix(in srgb, var(--kali-border, var(--color-border)) 25%, transparent)',
      }}
    >
      <div className="pointer-events-none absolute inset-0 -z-10 rounded-[inherit] bg-[radial-gradient(140%_120%_at_50%_-10%,rgba(80,157,255,0.38),rgba(25,48,108,0.16)_45%,transparent)] opacity-100" />

      <div className="pb-3">
        <p
          className="text-xs font-semibold uppercase tracking-[0.16em]"
          style={{ color: 'var(--kali-text-subtle)' }}
        >
          Quick settings
        </p>
        <p className="mt-1 text-xs" style={{ color: 'var(--kali-text-faint)' }}>
          Personalise the desktop in one place.
        </p>
      </div>

      <section
        aria-label="System snapshot"
        className="rounded-xl border p-3 shadow-inner"
        style={{
          borderColor: 'color-mix(in srgb, var(--kali-border, var(--color-border)) 30%, transparent)',
          backgroundColor:
            'color-mix(in srgb, var(--color-surface-muted, rgba(15,23,42,0.75)) 82%, rgba(255,255,255,0.1))',
        }}
      >
        <div className="flex items-center justify-between gap-2">
          <span
            className="text-xs font-semibold uppercase tracking-wide"
            style={{ color: 'var(--kali-text)' }}
          >
            Status
          </span>
          <span
            className="text-[10px] uppercase tracking-[0.2em]"
            style={{ color: 'var(--kali-text-subtle)' }}
          >
            Live
          </span>
        </div>
        <div className="mt-3 flex flex-wrap gap-2" aria-live="polite">
          {statusBadges.map(({ id, label, value }) => (
            <span
              key={id}
              className="inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium shadow-sm"
              style={{
                borderColor:
                  'color-mix(in srgb, var(--kali-border, var(--color-border)) 35%, transparent)',
                backgroundColor:
                  'color-mix(in srgb, var(--kali-panel, rgba(15,23,42,0.85)) 55%, var(--kali-panel-highlight, rgba(255,255,255,0.12)))',
                color: 'var(--kali-text)',
              }}
            >
              <span
                className="flex h-1.5 w-1.5 rounded-full"
                style={{
                  backgroundColor: 'var(--kali-control)',
                  boxShadow: '0 0 0 2px color-mix(in srgb, var(--kali-control) 45%, transparent)',
                }}
                aria-hidden
              />
              <span className="uppercase tracking-wide" style={{ color: 'var(--kali-text-subtle)' }}>
                {label}
              </span>
              <span className="font-semibold" style={{ color: 'var(--kali-text)' }}>
                {value}
              </span>
            </span>
          ))}
        </div>
      </section>

      <section
        aria-label="Appearance"
        className="rounded-xl border p-3 shadow-inner"
        style={{
          borderColor: 'color-mix(in srgb, var(--kali-border, var(--color-border)) 30%, transparent)',
          backgroundColor:
            'color-mix(in srgb, var(--color-surface-muted, rgba(15,23,42,0.75)) 82%, rgba(255,255,255,0.1))',
        }}
      >
        <div className="flex items-center justify-between gap-2">
          <span
            className="text-xs font-semibold uppercase tracking-wide"
            style={{ color: 'var(--kali-text)' }}
          >
            Theme
          </span>
          <span
            className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider"
            style={{
              backgroundColor: 'color-mix(in srgb, var(--kali-panel-highlight) 80%, rgba(255,255,255,0.06))',
              color: 'var(--kali-text)',
            }}
          >
            <span
              className="h-1.5 w-1.5 rounded-full"
              style={{ backgroundColor: 'var(--kali-control)' }}
              aria-hidden
            />
            {themeDisplayName}
          </span>
        </div>
        <ThemeSwitcher
          className="mt-3 grid grid-cols-1 sm:grid-cols-3"
          focusableTabIndex={focusableTabIndex}
        />
      </section>

      <section
        aria-label="Device controls"
        className="mt-4 space-y-3 rounded-xl border p-3 shadow-inner"
        style={{
          borderColor: 'color-mix(in srgb, var(--kali-border, var(--color-border)) 30%, transparent)',
          backgroundColor:
            'color-mix(in srgb, var(--color-surface-muted, rgba(15,23,42,0.75)) 82%, rgba(255,255,255,0.1))',
        }}
      >
        <div className="flex items-center justify-between gap-2">
          <span
            className="text-xs font-semibold uppercase tracking-wide"
            style={{ color: 'var(--kali-text)' }}
          >
            Device
          </span>
          <span
            className="text-[10px] uppercase tracking-[0.2em]"
            style={{ color: 'var(--kali-text-subtle)' }}
          >
            Fine tune
          </span>
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
              className={`group flex items-start gap-3 rounded-lg border p-3 transition duration-150 ${
                disabled ? 'opacity-70' : ''
              }`}
              style={{
                borderColor: 'color-mix(in srgb, var(--kali-border, var(--color-border)) 28%, transparent)',
                backgroundColor:
                  'color-mix(in srgb, var(--color-surface-muted, rgba(15,23,42,0.75)) 85%, rgba(255,255,255,0.08))',
              }}
              aria-disabled={disabled}
            >
              <span
                className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
                style={{
                  backgroundColor:
                    'color-mix(in srgb, var(--kali-panel, rgba(15,23,42,0.85)) 60%, rgba(255,255,255,0.12))',
                  color: 'var(--kali-text)',
                }}
              >
                <span
                  className={`absolute inset-0 rounded-xl bg-gradient-to-br ${accent} opacity-0 transition-opacity duration-200 group-hover:opacity-100`}
                  aria-hidden
                />
                <span className="relative text-lg" aria-hidden>
                  {icon}
                </span>
              </span>
              <div className="flex-1">
                <div
                  className="flex items-center justify-between gap-2 text-xs"
                  style={{ color: 'var(--kali-text-subtle)' }}
                >
                  <div className="flex flex-col" style={{ color: 'var(--kali-text)' }}>
                    <span id={labelId} className="font-semibold">
                      {label}
                    </span>
                    <span id={descriptionId} style={{ color: 'var(--kali-text-subtle)' }}>
                      {description}
                    </span>
                  </div>
                  <span className="font-semibold" style={{ color: 'var(--kali-text)' }}>
                    {value}
                    {unit}
                  </span>
                </div>
                  <div
                    className="relative mt-3 h-2 w-full overflow-hidden rounded-full"
                    style={{
                      backgroundColor:
                        'color-mix(in srgb, var(--color-surface-muted, rgba(15,23,42,0.75)) 70%, rgba(255,255,255,0.08))',
                    }}
                  >
                    <div
                      className="absolute inset-y-0 left-0 rounded-full"
                      style={{
                        background: disabled
                          ? 'color-mix(in srgb, var(--kali-text-subtle) 65%, rgba(255,255,255,0.12))'
                          : 'linear-gradient(90deg, var(--kali-control) 0%, color-mix(in srgb, var(--kali-control) 60%, transparent) 100%)',
                        width: `${value}%`,
                      }}
                      aria-hidden
                    />
                    <input
                      id={id}
                      type="range"
                      min={0}
                      max={100}
                      value={value}
                      onChange={(event) => onChange(Number(event.target.value))}
                      className="relative h-2 w-full cursor-pointer appearance-none bg-transparent focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
                      style={{ outlineColor: 'var(--focus-outline-color)' }}
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

      <div className="mt-4 space-y-2" role="none">
        {toggles.map(({ id, label, description, value, onToggle, icon, accent }) => {
          const labelId = `${id}-label`;
          const descriptionId = `${id}-description`;
          return (
            <div
              key={id}
              role="presentation"
              className="group flex items-center justify-between gap-3 rounded-xl border px-3 py-3 transition duration-150"
              style={{
                borderColor: 'color-mix(in srgb, var(--kali-border, var(--color-border)) 28%, transparent)',
                backgroundColor:
                  'color-mix(in srgb, var(--color-surface-muted, rgba(15,23,42,0.75)) 80%, rgba(255,255,255,0.08))',
              }}
            >
              <div className="flex items-start gap-3">
                <span
                  className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
                  style={{
                    backgroundColor:
                      'color-mix(in srgb, var(--kali-panel, rgba(15,23,42,0.85)) 58%, rgba(255,255,255,0.12))',
                    color: 'var(--kali-text)',
                  }}
                >
                  <span
                    className={`absolute inset-0 rounded-xl bg-gradient-to-br ${accent} opacity-0 transition-opacity duration-200 group-hover:opacity-100 group-focus-within:opacity-100`}
                    aria-hidden
                  />
                  <span className="relative text-lg" aria-hidden>
                    {icon}
                  </span>
                </span>
                <label htmlFor={id} className="flex flex-col" style={{ color: 'var(--kali-text)' }}>
                  <span id={labelId} className="font-semibold">
                    {label}
                  </span>
                  <span id={descriptionId} className="text-xs" style={{ color: 'var(--kali-text-subtle)' }}>
                    {description}
                  </span>
                </label>
              </div>
              <div className="flex flex-col items-end gap-1">
                <span
                  aria-hidden
                  className="inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider"
                  style={{
                    borderColor: 'color-mix(in srgb, var(--kali-border, var(--color-border)) 30%, transparent)',
                    backgroundColor: value
                      ? 'var(--kali-control-overlay)'
                      : 'color-mix(in srgb, var(--color-surface-muted, rgba(15,23,42,0.75)) 70%, rgba(255,255,255,0.08))',
                    color: value ? '#000000' : 'var(--kali-text)',
                  }}
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
                  className="relative inline-flex h-6 w-12 shrink-0 items-center rounded-full border transition-all focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
                  style={{
                    borderColor: 'color-mix(in srgb, var(--kali-border, var(--color-border)) 35%, transparent)',
                    backgroundColor: value
                      ? 'var(--kali-control)'
                      : 'color-mix(in srgb, var(--color-surface-muted, rgba(15,23,42,0.75)) 75%, rgba(255,255,255,0.08))',
                    outlineColor: 'var(--focus-outline-color)',
                    boxShadow: value
                      ? '0 0 18px rgba(255,222,0,0.35)'
                      : 'none',
                  }}
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

const SoundIcon = () => (
  <svg
    width="18"
    height="18"
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
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

export default QuickSettings;
