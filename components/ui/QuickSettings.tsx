"use client";

import Image from 'next/image';
import { ChangeEvent, useEffect } from 'react';

import usePersistentState from '../../hooks/usePersistentState';

interface Props {
  open: boolean;
}

const BRIGHTNESS_MIN = 40;
const BRIGHTNESS_MAX = 100;

const isBoolean = (value: unknown): value is boolean => typeof value === 'boolean';
const isTheme = (value: unknown): value is 'light' | 'dark' => value === 'light' || value === 'dark';
const isBrightness = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value) && value >= BRIGHTNESS_MIN && value <= BRIGHTNESS_MAX;

const QuickSettings = ({ open }: Props) => {
  const [theme, setTheme] = usePersistentState<'light' | 'dark'>('qs-theme', 'light', isTheme);
  const [sound, setSound] = usePersistentState<boolean>('qs-sound', true, isBoolean);
  const [online, setOnline] = usePersistentState<boolean>('qs-online', true, isBoolean);
  const [reduceMotion, setReduceMotion] = usePersistentState<boolean>('qs-reduce-motion', false, isBoolean);
  const [brightness, setBrightness] = usePersistentState<number>('qs-brightness', BRIGHTNESS_MAX, isBrightness);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
  }, [theme]);

  useEffect(() => {
    document.documentElement.classList.toggle('reduce-motion', reduceMotion);
  }, [reduceMotion]);

  useEffect(() => {
    document.documentElement.style.setProperty('--screen-brightness', String(brightness / 100));
  }, [brightness]);

  const handleBrightnessChange = (event: ChangeEvent<HTMLInputElement>) => {
    setBrightness(Number(event.target.value));
  };

  return (
    <div
      className={`absolute top-9 right-3 w-72 rounded-xl glass p-4 text-sm text-white/90 transition-all duration-150 ${
        open ? 'opacity-100 translate-y-0' : 'pointer-events-none -translate-y-2 opacity-0'
      }`}
      aria-hidden={!open}
    >
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Image
              src="/themes/Kali/panel/emblem-system-symbolic.svg"
              alt="Theme settings"
              width={20}
              height={20}
              className="opacity-80"
            />
            <span>Theme</span>
          </div>
          <button
            type="button"
            className="rounded-md border border-white/10 bg-white/10 px-3 py-1 text-xs font-semibold text-white transition hover:bg-white/20"
            onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
          >
            {theme === 'light' ? 'Light' : 'Dark'}
          </button>
        </div>

        <div>
          <div className="mb-2 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Image
                src="/themes/Kali/panel/display-brightness-symbolic.svg"
                alt="Brightness"
                width={20}
                height={20}
                className="opacity-80"
              />
              <span>Brightness</span>
            </div>
            <span className="text-xs text-white/70">{brightness}%</span>
          </div>
          <input
            id="quick-settings-brightness"
            aria-label="Screen brightness"
            type="range"
            min={BRIGHTNESS_MIN}
            max={BRIGHTNESS_MAX}
            step={1}
            value={brightness}
            onChange={handleBrightnessChange}
            className="h-1 w-full cursor-pointer accent-kali-accent"
          />
        </div>

        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Image
              src="/themes/Kali/panel/audio-volume-medium-symbolic.svg"
              alt="Sound"
              width={20}
              height={20}
              className="opacity-80"
            />
            <span>Sound</span>
          </div>
          <input
            type="checkbox"
            checked={sound}
            onChange={() => setSound(!sound)}
            className="h-5 w-5 cursor-pointer accent-kali-accent"
          />
        </div>

        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Image
              src="/themes/Kali/panel/network-wireless-signal-good-symbolic.svg"
              alt="Network"
              width={20}
              height={20}
              className="opacity-80"
            />
            <span>Network</span>
          </div>
          <input
            type="checkbox"
            checked={online}
            onChange={() => setOnline(!online)}
            className="h-5 w-5 cursor-pointer accent-kali-accent"
          />
        </div>

        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Image
              src="/themes/Kali/panel/process-working-symbolic.svg"
              alt="Reduced motion"
              width={20}
              height={20}
              className="opacity-80"
            />
            <span>Reduced motion</span>
          </div>
          <input
            type="checkbox"
            checked={reduceMotion}
            onChange={() => setReduceMotion(!reduceMotion)}
            className="h-5 w-5 cursor-pointer accent-kali-accent"
          />
        </div>
      </div>
    </div>
  );
};

export default QuickSettings;
