"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/router";
import usePersistentState from "../../../hooks/usePersistentState";
import AccessibleToggle from "../../base/AccessibleToggle";
import { useSettings } from "../../../hooks/useSettings";
import { isDarkTheme } from "../../../utils/theme";
import {
  getSettingsHref,
  navigateToSettings,
  type SettingsSection,
} from "../../../utils/navigation";

interface PanelProps {
  open: boolean;
}

const clampPercentage = (value: number) => {
  if (Number.isNaN(value)) return 0;
  return Math.min(100, Math.max(0, Math.round(value)));
};

const percentValidator = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value);

const booleanValidator = (value: unknown): value is boolean =>
  typeof value === "boolean";

const TRANSITION_DURATION = 135;

const SliderControl = ({
  id,
  label,
  icon,
  value,
  onChange,
  disabled,
}: {
  id: string;
  label: string;
  icon: string;
  value: number;
  onChange: (next: number) => void;
  disabled: boolean;
}) => {
  const clamped = clampPercentage(value);
  const describedBy = `${id}-value`;
  return (
    <div className="rounded-xl border border-black border-opacity-20 bg-ub-cool-grey/80 p-4 shadow-sm">
      <div className="flex items-center justify-between text-sm font-semibold text-ubt-grey">
        <span className="flex items-center gap-2 text-ubt-grey">
          <span aria-hidden className="text-lg leading-none">
            {icon}
          </span>
          {label}
        </span>
        <output
          id={describedBy}
          className="text-xs uppercase tracking-wide text-ubt-grey text-opacity-80"
          aria-live="off"
        >
          {clamped}%
        </output>
      </div>
      <input
        id={id}
        type="range"
        min={0}
        max={100}
        value={clamped}
        aria-label={label}
        aria-describedby={describedBy}
        aria-valuetext={`${clamped}%`}
        className="mt-3 w-full accent-ub-orange"
        disabled={disabled}
        onChange={(event) => onChange(Number(event.target.value))}
      />
    </div>
  );
};

const getBrightnessFactor = (value: number) => {
  const clamped = clampPercentage(value);
  return (0.5 + clamped / 200).toFixed(3);
};

const getVolumeLevel = (value: number) => {
  const clamped = clampPercentage(value);
  return (clamped / 100).toFixed(3);
};

const SETTINGS_LINKS: Record<string, SettingsSection> = {
  network: "privacy",
  dark: "appearance",
  contrast: "accessibility",
  motion: "accessibility",
};

const Panel = ({ open }: PanelProps) => {
  const router = useRouter();
  const {
    allowNetwork,
    setAllowNetwork,
    reducedMotion,
    setReducedMotion,
    highContrast,
    setHighContrast,
    theme,
    setTheme,
  } = useSettings();
  const [soundEnabled, setSoundEnabled] = usePersistentState(
    "qs-sound",
    true,
    booleanValidator,
  );
  const [brightness, setBrightness] = usePersistentState(
    "qs-brightness",
    100,
    percentValidator,
  );
  const [volume, setVolume] = usePersistentState(
    "qs-volume",
    70,
    percentValidator,
  );
  const previousVolume = useRef(volume);

  const [rendered, setRendered] = useState(open);
  useEffect(() => {
    if (open) {
      setRendered(true);
    } else {
      const timeout = window.setTimeout(
        () => setRendered(false),
        TRANSITION_DURATION,
      );
      return () => window.clearTimeout(timeout);
    }
    return undefined;
  }, [open]);

  useEffect(() => {
    const factor = getBrightnessFactor(brightness);
    document.documentElement.style.setProperty(
      "--quick-settings-brightness",
      factor,
    );
    document.documentElement.dataset.brightness = factor;
  }, [brightness]);

  useEffect(() => {
    const level = getVolumeLevel(volume);
    document.documentElement.style.setProperty(
      "--quick-settings-volume",
      level,
    );
    document.documentElement.dataset.volume = level;
  }, [volume]);

  useEffect(() => {
    if (volume > 0) {
      previousVolume.current = volume;
    }
  }, [volume]);

  const previousLightTheme = useRef<string | null>(null);

  useEffect(() => {
    if (!isDarkTheme(theme)) {
      previousLightTheme.current = theme;
    }
  }, [theme]);

  useEffect(() => {
    document.documentElement.dataset.sound = soundEnabled ? "on" : "muted";
  }, [soundEnabled]);

  const toggleSound = () => {
    setSoundEnabled((prev) => {
      const next = !prev;
      if (next) {
        if (volume === 0) {
          const fallback = previousVolume.current > 0 ? previousVolume.current : 70;
          setVolume(fallback);
        }
      } else {
        if (volume > 0) {
          previousVolume.current = volume;
        }
        setVolume(0);
      }
      return next;
    });
  };

  const handleDarkModeToggle = (next: boolean) => {
    if (next) {
      if (!isDarkTheme(theme)) {
        previousLightTheme.current = theme;
      }
      setTheme("dark");
    } else {
      const fallback = previousLightTheme.current ?? "default";
      setTheme(fallback);
    }
  };

  const navigate = (section: SettingsSection) => {
    navigateToSettings(router, section);
  };

  const panelHidden = !open && !rendered;

  if (panelHidden) {
    return null;
  }

  const darkActive = isDarkTheme(theme);

  return (
    <section
      id="quick-settings-panel"
      role="dialog"
      aria-label="Quick settings"
      aria-hidden={!open}
      data-state={open ? "open" : "closed"}
      className={`pointer-events-none absolute right-3 top-9 z-50 w-80 max-w-[calc(100vw-1.5rem)] transition-all will-change-transform ${
        open ? "pointer-events-auto" : ""
      }`}
      style={{
        transitionDuration: "calc(var(--motion-fast, 150ms) * 0.9)",
        transitionTimingFunction: "cubic-bezier(0.2, 0, 0, 1)",
      }}
    >
      <div
        className={`rounded-2xl border border-black border-opacity-20 bg-ub-cool-grey/95 p-4 shadow-2xl backdrop-blur-sm transition-all ${
          open
            ? "translate-y-0 opacity-100"
            : "-translate-y-2 opacity-0"
        }`}
        style={{
          transitionDuration: "calc(var(--motion-fast, 150ms) * 0.9)",
          transitionTimingFunction: "cubic-bezier(0.2, 0, 0, 1)",
        }}
      >
        <div className="mb-4 text-xs uppercase tracking-wide text-ubt-grey text-opacity-80">
          {open ? "Quick Controls" : ""}
        </div>
        <div
          className="grid grid-cols-2 gap-3"
          role="group"
          aria-label="System toggles"
        >
          <AccessibleToggle
            id="quick-toggle-network"
            label="Network Access"
            description="Allow apps to reach the internet"
            icon="📶"
            checked={allowNetwork}
            onToggle={setAllowNetwork}
            onLongPress={() => navigate(SETTINGS_LINKS.network)}
            statusLabel={allowNetwork ? "Allowed" : "Blocked"}
            disabled={!open}
          />
          <AccessibleToggle
            id="quick-toggle-dark"
            label="Dark Theme"
            description="Switch between light and dark UI"
            icon="🌙"
            checked={darkActive}
            onToggle={handleDarkModeToggle}
            onLongPress={() => navigate(SETTINGS_LINKS.dark)}
            statusLabel={darkActive ? "Dark" : "Default"}
            disabled={!open}
          />
          <AccessibleToggle
            id="quick-toggle-contrast"
            label="High Contrast"
            description="Boost text and control contrast"
            icon="🌓"
            checked={highContrast}
            onToggle={setHighContrast}
            onLongPress={() => navigate(SETTINGS_LINKS.contrast)}
            statusLabel={highContrast ? "High" : "Standard"}
            disabled={!open}
          />
          <AccessibleToggle
            id="quick-toggle-motion"
            label="Reduce Motion"
            description="Simplify animations across the desktop"
            icon="🎞️"
            checked={reducedMotion}
            onToggle={setReducedMotion}
            onLongPress={() => navigate(SETTINGS_LINKS.motion)}
            statusLabel={reducedMotion ? "Reduced" : "Full"}
            disabled={!open}
          />
        </div>
        <div
          className="mt-4 flex flex-col gap-3"
          role="group"
          aria-label="Display and audio controls"
        >
          <SliderControl
            id="quick-slider-brightness"
            label="Brightness"
            icon="💡"
            value={brightness}
            onChange={setBrightness}
            disabled={!open}
          />
          <SliderControl
            id="quick-slider-volume"
            label="Volume"
            icon={soundEnabled ? "🔊" : "🔇"}
            value={volume}
            onChange={(next) => {
              setVolume(next);
              if (next === 0) {
                setSoundEnabled(false);
              } else if (!soundEnabled) {
                setSoundEnabled(true);
              }
            }}
            disabled={!open}
          />
          <div className="flex items-center justify-between text-xs text-ubt-grey text-opacity-80">
            <span>Sound</span>
            <button
              type="button"
              className="rounded-md border border-black border-opacity-10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-ubt-grey transition-colors hover:border-opacity-30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-ub-orange"
              onClick={toggleSound}
              onKeyDown={(event) => {
                if (event.key === " " || event.key === "Enter") {
                  event.preventDefault();
                }
              }}
              onKeyUp={(event) => {
                if (event.key === " " || event.key === "Enter") {
                  event.preventDefault();
                  toggleSound();
                }
              }}
              aria-pressed={soundEnabled}
              aria-label={soundEnabled ? "Mute sound" : "Unmute sound"}
              disabled={!open}
            >
              {soundEnabled ? "Mute" : "Unmute"}
            </button>
          </div>
        </div>
        <div className="mt-4 border-t border-black border-opacity-10 pt-3 text-right">
          <a
            href={getSettingsHref("appearance")}
            className="text-xs font-semibold uppercase tracking-wide text-ub-orange transition-colors hover:text-ubb-orange focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-ub-orange"
          >
            Open Settings
          </a>
        </div>
      </div>
    </section>
  );
};

export default Panel;
