"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import usePersistentState from "../../hooks/usePersistentState";

const STORAGE_KEY = "status-tray-sticky-keys";
const RESET_ANNOUNCEMENT_DELAY = 1200;

type AudioContextConstructor = typeof AudioContext;

type ExtendedWindow = Window & {
  webkitAudioContext?: AudioContextConstructor;
};

const getAudioContextConstructor = (): AudioContextConstructor | null => {
  if (typeof window === "undefined") return null;
  const extendedWindow = window as ExtendedWindow;
  return window.AudioContext || extendedWindow.webkitAudioContext || null;
};

const StatusTray = () => {
  const [stickyKeysEnabled, setStickyKeysEnabled] = usePersistentState<boolean>(
    STORAGE_KEY,
    false,
    (value): value is boolean => typeof value === "boolean",
  );
  const [announcement, setAnnouncement] = useState("");
  const audioContextRef = useRef<AudioContext | null>(null);

  const ensureAudioContext = useCallback(() => {
    if (typeof window === "undefined") return null;
    const AudioContextCtor = getAudioContextConstructor();
    if (!AudioContextCtor) return null;

    if (!audioContextRef.current) {
      audioContextRef.current = new AudioContextCtor();
    }

    if (audioContextRef.current.state === "suspended") {
      void audioContextRef.current.resume().catch(() => undefined);
    }

    return audioContextRef.current;
  }, []);

  const playToggleSound = useCallback(
    (enabled: boolean) => {
      const context = ensureAudioContext();
      if (!context) return;

      const oscillator = context.createOscillator();
      const gain = context.createGain();
      const now = context.currentTime;

      oscillator.type = "sine";
      oscillator.frequency.value = enabled ? 880 : 440;

      oscillator.connect(gain);
      gain.connect(context.destination);

      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.linearRampToValueAtTime(0.2, now + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.25);

      oscillator.start(now);
      oscillator.stop(now + 0.3);
    },
    [ensureAudioContext],
  );

  useEffect(() => {
    if (!announcement) return undefined;
    const timeout = window.setTimeout(() => setAnnouncement(""), RESET_ANNOUNCEMENT_DELAY);
    return () => window.clearTimeout(timeout);
  }, [announcement]);

  useEffect(
    () => () => {
      if (audioContextRef.current) {
        audioContextRef.current.close().catch(() => undefined);
        audioContextRef.current = null;
      }
    },
    [],
  );

  const handleStickyKeysToggle = () => {
    const nextValue = !stickyKeysEnabled;
    setStickyKeysEnabled(nextValue);
    playToggleSound(nextValue);
    setAnnouncement(`Sticky keys ${nextValue ? "enabled" : "disabled"}.`);
  };

  return (
    <section
      aria-label="Status tray"
      className="flex flex-col gap-4 rounded-lg border border-white/5 bg-black/40 p-4 text-sm text-zinc-200 shadow-lg backdrop-blur"
    >
      <header className="text-xs uppercase tracking-wide text-zinc-400">Accessibility</header>
      <div className="flex items-center justify-between gap-3 rounded-md bg-white/5 p-3">
        <div>
          <p className="text-sm font-semibold text-white">Sticky keys</p>
          <p className="text-xs text-zinc-300">
            {stickyKeysEnabled ? "Enabled" : "Disabled"}
          </p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={stickyKeysEnabled}
          onClick={handleStickyKeysToggle}
          className={`flex items-center gap-2 rounded-full px-4 py-2 text-xs font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-white/80 ${
            stickyKeysEnabled ? "bg-emerald-400 text-emerald-900" : "bg-zinc-700 text-zinc-100"
          }`}
        >
          <span aria-hidden="true">{stickyKeysEnabled ? "On" : "Off"}</span>
          <span className="sr-only">
            {stickyKeysEnabled ? "Disable sticky keys" : "Enable sticky keys"}
          </span>
          <span
            aria-hidden="true"
            className={`inline-block h-2 w-2 rounded-full ${stickyKeysEnabled ? "bg-emerald-900" : "bg-zinc-300"}`}
          />
        </button>
      </div>
      <div aria-live="polite" className="sr-only">
        {announcement}
      </div>
    </section>
  );
};

export default StatusTray;
