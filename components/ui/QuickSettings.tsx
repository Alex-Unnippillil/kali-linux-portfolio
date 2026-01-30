"use client";

import { ReactNode, useEffect, useRef, useState } from 'react';
import Toast from './Toast';
import usePersistentState from '../../hooks/usePersistentState';
import { useTheme } from '../../hooks/useTheme';

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
  const [bluetooth, setBluetooth] = usePersistentState('qs-bluetooth', true);
  const [airplaneMode, setAirplaneMode] = usePersistentState('qs-airplane', false);
  const [nightLight, setNightLight] = usePersistentState('qs-night-light', false);

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

  // Mock Battery State
  const [batteryLevel, setBatteryLevel] = useState(100);
  const [isCharging, setIsCharging] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  useEffect(() => {
    // Simple battery mock or API if available
    if (typeof navigator !== 'undefined' && (navigator as any).getBattery) {
      (navigator as any).getBattery().then((battery: any) => {
        setBatteryLevel(battery.level * 100);
        setIsCharging(battery.charging);

        battery.addEventListener('levelchange', () => setBatteryLevel(battery.level * 100));
        battery.addEventListener('chargingchange', () => setIsCharging(battery.charging));
      }).catch(() => { });
    }
  }, []);

  const panelRef = useRef<HTMLDivElement>(null);
  const [shouldRender, setShouldRender] = useState(open);
  const [isVisible, setIsVisible] = useState(open);
  const focusableTabIndex = open ? 0 : -1;

  useEffect(() => {
    document.documentElement.classList.toggle('night-light', nightLight);
  }, [nightLight]);

  useEffect(() => {
    document.documentElement.toggleAttribute('data-sound-muted', !sound);
  }, [sound]);

  useEffect(() => {
    document.documentElement.toggleAttribute('data-offline', !online);
  }, [online]);

  useEffect(() => {
    if (airplaneMode) {
      setOnline(false);
      setBluetooth(false);
    }
  }, [airplaneMode, setOnline, setBluetooth]);

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

  const statusToneStyles: Record<
    'positive' | 'warning' | 'info' | 'muted' | 'danger',
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
    danger: {
      icon: 'bg-red-400/20 text-red-200',
      value: 'text-red-100',
      ring: 'shadow-[0_0_0_1px_rgba(239,68,68,0.25)]',
    },
    muted: {
      icon: 'bg-white/10 text-white/70',
      value: 'text-white/70',
      ring: 'shadow-[0_0_0_1px_rgba(148,163,184,0.18)]',
    },
  };

  const isLightTheme = activeTheme === 'light';

  const statusBadges: Array<{
    id: string;
    label: string;
    value: string;
    icon: ReactNode;
    tone: keyof typeof statusToneStyles;
  }> = [
      {
        id: 'battery',
        label: 'Battery',
        value: `${Math.round(batteryLevel)}%${isCharging ? ' Charging' : ''}`,
        icon: <BatteryIcon level={batteryLevel} charging={isCharging} />,
        tone: batteryLevel < 20 && !isCharging ? 'danger' : isCharging ? 'positive' : 'info',
      },
      {
        id: 'network',
        label: 'Network',
        value: airplaneMode ? 'Airplane Mode' : online ? 'Online' : 'Offline',
        icon: airplaneMode ? <AirplaneIcon /> : <NetworkIcon />,
        tone: airplaneMode ? 'muted' : online ? 'positive' : 'warning',
      },
      {
        id: 'bluetooth',
        label: 'Bluetooth',
        value: bluetooth ? 'On' : 'Off',
        icon: <BluetoothIcon />,
        tone: bluetooth ? 'info' : 'muted',
      },
      {
        id: 'focus',
        label: 'Focus',
        value: focusMode ? 'On' : 'Off',
        icon: <FocusIcon />,
        tone: focusMode ? 'info' : 'muted',
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
        id: 'qs-airplane',
        label: 'Airplane Mode',
        description: 'Disable all wireless connections.',
        value: airplaneMode,
        onToggle: () => {
          const newState = !airplaneMode;
          setAirplaneMode(newState);
          setToastMessage(newState ? 'Airplane Mode Enabled' : 'Airplane Mode Disabled');
        },
        accent: 'from-orange-400/30 via-orange-500/10 to-transparent',
        icon: <AirplaneIcon />,
      },
      {
        id: 'qs-wifi',
        label: 'Wi-Fi',
        description: 'Connect to wireless networks.',
        value: online && !airplaneMode,
        onToggle: () => {
          if (airplaneMode) setAirplaneMode(false);
          const newState = !online;
          setOnline(newState);
          setToastMessage(newState ? 'Wi-Fi Enabled' : 'Wi-Fi Disabled');
        },
        accent: 'from-emerald-400/30 via-emerald-500/10 to-transparent',
        icon: <NetworkIcon />,
      },
      {
        id: 'qs-bluetooth',
        label: 'Bluetooth',
        description: 'Connect to devices.',
        value: bluetooth && !airplaneMode,
        onToggle: () => {
          if (airplaneMode) setAirplaneMode(false);
          const newState = !bluetooth;
          setBluetooth(newState);
          setToastMessage(newState ? 'Bluetooth Enabled' : 'Bluetooth Disabled');
        },
        accent: 'from-blue-400/30 via-blue-500/10 to-transparent',
        icon: <BluetoothIcon />,
      },
      {
        id: 'qs-focus',
        label: 'Do Not Disturb',
        description: 'Silence notifications.',
        value: focusMode,
        onToggle: () => {
          const newState = !focusMode;
          setFocusMode(newState);
          setToastMessage(newState ? 'Do Not Disturb Enabled' : 'Do Not Disturb Disabled');
        },
        accent: 'from-purple-400/30 via-purple-500/10 to-transparent',
        icon: <FocusIcon />,
      },
      {
        id: 'qs-night-light',
        label: 'Night Light',
        description: 'Warmer colors for eye care.',
        value: nightLight,
        onToggle: () => {
          const newState = !nightLight;
          setNightLight(newState);
          setToastMessage(newState ? 'Night Light Enabled' : 'Night Light Disabled');
        },
        accent: 'from-amber-400/30 via-amber-500/10 to-transparent',
        icon: <NightLightIcon />,
      },
      {
        id: 'qs-screen-rec',
        label: 'Screen Rec',
        description: 'Record your desktop.',
        value: false, // Stateless trigger
        onToggle: () => window.dispatchEvent(new CustomEvent('taskbar-command', { detail: { appId: 'screen-recorder', action: 'open' } })),
        accent: 'from-red-400/30 via-red-500/10 to-transparent',
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
        description: 'Display glow.',
        value: brightness,
        onChange: (value) => setBrightness(Math.min(100, Math.max(0, value))),
        icon: <SunIcon />,
        accent: 'from-sky-400 via-sky-500 to-transparent',
        unit: '%',
        ariaValueText: `${brightness}% brightness`,
      },
      {
        id: 'quick-settings-volume',
        label: 'Volume',
        description: sound ? 'System volume.' : 'Muted',
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
    <>
      {toastMessage && (
        <Toast
          key={Date.now()}
          message={toastMessage}
          onClose={() => setToastMessage(null)}
          duration={2000}
        />
      )}
      <div
        id={id}
        ref={panelRef}
        role="menu"
        aria-label="Quick settings"
        aria-hidden={!open}
        className={`group/qs absolute top-9 right-3 w-[90vw] sm:w-[20rem] origin-top-right rounded-2xl border border-white/10 bg-slate-950/90 p-4 text-xs text-slate-100 shadow-[0_32px_64px_-12px_rgba(0,0,0,0.6)] backdrop-blur-xl transition-all duration-300 focus:outline-none max-h-[calc(100vh-5rem)] overflow-y-auto overscroll-contain z-50 ${isVisible
          ? 'pointer-events-auto translate-y-0 scale-100 opacity-100'
          : 'pointer-events-none -translate-y-4 scale-95 opacity-0'
          }`}
      >
        <div className="pb-4 flex items-center justify-between">
          <div
            role="button"
            tabIndex={0}
            onClick={() => {
              window.dispatchEvent(new CustomEvent('taskbar-command', { detail: { appId: 'settings', action: 'open' } }));
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                window.dispatchEvent(new CustomEvent('taskbar-command', { detail: { appId: 'settings', action: 'open' } }));
              }
            }}
            className="cursor-pointer opacity-80 hover:opacity-100 transition-opacity"
          >
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-cyan-400/80">Control Center</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => updateTheme(isLightTheme ? 'default' : 'light')}
              className="p-1.5 rounded-full hover:bg-white/10 transition-colors"
              title="Toggle Theme"
            >
              {isLightTheme ? <MoonIcon /> : <SunIcon />}
            </button>
          </div>
        </div>

        <section aria-label="System snapshot" className="grid grid-cols-2 gap-3 mb-4">
          {statusBadges.map(({ id, label, value, icon, tone }) => {
            const toneStyle = statusToneStyles[tone];
            return (
              <div
                key={id}
                className={`flex flex-col gap-2 rounded-xl border border-white/5 bg-white/5 p-3 transition-colors hover:bg-white/10 ${toneStyle.ring}`}
              >
                <div className="flex items-start justify-between">
                  <span
                    className={`flex h-7 w-7 items-center justify-center rounded-lg ${toneStyle.icon}`}
                    aria-hidden
                  >
                    <span className="scale-90">{icon}</span>
                  </span>
                  <span className={`h-1.5 w-1.5 rounded-full ${tone === 'muted' ? 'bg-slate-500' : tone === 'danger' ? 'bg-red-500' : tone === 'warning' ? 'bg-amber-500' : 'bg-emerald-500'}`} />
                </div>
                <div>
                  <span className="block text-[10px] uppercase tracking-wider text-slate-400">{label}</span>
                  <span className={`block font-semibold ${toneStyle.value}`}>{value}</span>
                </div>
              </div>
            );
          })}
        </section>

        <section aria-label="Device controls" className="space-y-3 mb-4">
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
              return (
                <div
                  key={id}
                  className={`group flex flex-col gap-2 rounded-xl bg-white/5 p-3 transition duration-150 hover:bg-white/10 ${disabled ? 'opacity-50' : ''
                    }`}
                  aria-disabled={disabled}
                >
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2 text-slate-300">
                      {icon}
                      <span id={labelId} className="font-medium">{label}</span>
                    </div>
                    <span className="font-mono text-slate-400">{value}{unit}</span>
                  </div>

                  <div className="relative h-2 w-full overflow-hidden rounded-full bg-slate-800">
                    <div
                      className={`absolute inset-y-0 left-0 rounded-full bg-gradient-to-r ${disabled
                        ? 'from-slate-500 to-slate-600'
                        : accent
                        }`}
                      style={{ width: `${value}%` }}
                    />
                    <input
                      type="range"
                      min={0}
                      max={100}
                      value={value}
                      onChange={(event) => onChange(Number(event.target.value))}
                      className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                      tabIndex={focusableTabIndex}
                      aria-valuemin={0}
                      aria-valuemax={100}
                      aria-valuenow={value}
                      aria-valuetext={ariaValueText}
                      aria-labelledby={labelId}
                      disabled={disabled}
                    />
                  </div>
                </div>
              );
            },
          )}
        </section>

        <div className="space-y-2" role="group" aria-label="Quick Toggles">
          {toggles.map(({ id, label, description, value, onToggle, icon, accent }) => {
            const labelId = `${id}-label`;
            return (
              <button
                key={id}
                onClick={onToggle}
                aria-label={label}
                className={`flex w-full items-center justify-between gap-3 rounded-xl border border-transparent p-3 text-left transition-all duration-200 hover:scale-[1.02] ${value
                  ? 'bg-slate-800 border-slate-700/50 shadow-lg'
                  : 'bg-white/5 hover:bg-white/10 hover:border-white/5'
                  }`}
              >
                <div className="flex items-center gap-3">
                  <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-colors ${value ? 'bg-cyan-500/20 text-cyan-300' : 'bg-slate-700/50 text-slate-400'
                    }`}>
                    {icon}
                  </span>
                  <div className="flex flex-col">
                    <span className={`font-semibold transition-colors ${value ? 'text-white' : 'text-slate-300'}`}>
                      {label}
                    </span>
                    <span className="text-[10px] text-slate-500">{description}</span>
                  </div>
                </div>
                <div className={`h-3 w-3 rounded-full border border-white/10 ${value ? 'bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.5)]' : 'bg-slate-700'}`} />
              </button>
            );
          })}
        </div>

        <div className="mt-4 grid grid-cols-3 gap-3 border-t border-white/5 pt-4">
          <button
            onClick={() => window.location.reload()}
            className="flex flex-col items-center gap-2 rounded-xl bg-white/5 p-3 transition-colors hover:bg-white/10"
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-700/50 text-slate-300">
              <LockIcon />
            </span>
            <span className="text-[10px] font-medium text-slate-400">Lock</span>
          </button>
          <button
            onClick={() => window.location.reload()}
            className="flex flex-col items-center gap-2 rounded-xl bg-white/5 p-3 transition-colors hover:bg-white/10"
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-700/50 text-slate-300">
              <LogOutIcon />
            </span>
            <span className="text-[10px] font-medium text-slate-400">Log Out</span>
          </button>
          <button
            onClick={() => window.close()}
            className="flex flex-col items-center gap-2 rounded-xl bg-white/5 p-3 transition-colors hover:bg-red-500/20 group/power"
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-700/50 text-slate-300 group-hover/power:bg-red-500 group-hover/power:text-white transition-colors">
              <PowerIcon />
            </span>
            <span className="text-[10px] font-medium text-slate-400 group-hover/power:text-red-300 transition-colors">Power Off</span>
          </button>
        </div>
      </div>
    </>
  );
};

const SunIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="5" /><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" /></svg>
);

const MoonIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" /></svg>
);

const SoundIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" /><path d="M15.54 8.46a5 5 0 0 1 0 7.07" /></svg>
);

const NetworkIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12.55a11 11 0 0 1 14.08 0" /><path d="M1.42 9a16 16 0 0 1 21.16 0" /><path d="M8.53 16.11a6 6 0 0 1 6.95 0" /><line x1="12" y1="20" x2="12.01" y2="20" /></svg>
);

const FocusIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 0 1-3.46 0" /></svg>
);

const VolumeIcon = ({ muted }: { muted: boolean }) => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    {muted ? <path d="M11 5L6 9H2v6h4l5 4V5zM23 9l-6 6M17 9l6 6" /> : <><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" /><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07" /></>}
  </svg>
);

const BluetoothIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6.5 6.5 17.5 17.5 12 23 12 1 17.5 6.5 6.5 17.5" /></svg>
);

const AirplaneIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4c0 .6.4 1 1 1h2" /><path d="M2 17v2c0 .6.4 1 1 1h14c.6 0 1-.4 1-1v-2" /><path d="M6 10s3-6 8-6h2c.6 0 1 .4 1 1v2" /></svg>
);

interface BatteryProps {
  level: number;
  charging: boolean;
}
const BatteryIcon = ({ level, charging }: BatteryProps) => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="1" y="6" width="18" height="12" rx="2" ry="2" />
    <line x1="23" y1="13" x2="23" y2="11" />
    <path d="M3 8v8M5 17h10M5 7h10" strokeLinecap="butt" strokeDasharray="14" strokeDashoffset={14 * (1 - level / 100)} />
    {charging && <path d="M9 10l2 4l3-2" stroke="white" strokeWidth="1.5" />}
    {/* Simple fill representation */}
    <rect x="3" y="8" width={Math.max(0, (level / 100) * 14)} height="8" fill="currentColor" opacity="0.4" stroke="none" />
  </svg>
);

const NightLightIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2a5 5 0 0 0-5 5v2a5 5 0 0 0 10 0V7a5 5 0 0 0-5-5z" /><path d="M12 14v4" /><path d="M8 21h8" /></svg>
);

const RecordIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><circle cx="12" cy="12" r="3" fill="currentColor" stroke="none" /></svg>
);

const LockIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>
);

const LogOutIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" /></svg>
);

const PowerIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18.36 6.64a9 9 0 1 1-12.73 0" /><line x1="12" y1="2" x2="12" y2="12" /></svg>
);

export default QuickSettings;
