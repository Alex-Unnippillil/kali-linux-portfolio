"use client";

import usePersistentState from '../../hooks/usePersistentState';
import { useEffect } from 'react';
import Link from 'next/link';

interface Props {
  open: boolean;
}

const QuickSettings = ({ open }: Props) => {
  const [theme, setTheme] = usePersistentState('qs-theme', 'light');
  const [volume, setVolume] = usePersistentState('qs-volume', 1);
  const [muted, setMuted] = usePersistentState('qs-muted', false);
  const [device, setDevice] = usePersistentState('qs-device', 'speakers');
  const [profile, setProfile] = usePersistentState('qs-profile', 'Stereo');
  const [online, setOnline] = usePersistentState('qs-online', true);
  const [reduceMotion, setReduceMotion] = usePersistentState('qs-reduce-motion', false);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
  }, [theme]);

  useEffect(() => {
    document.documentElement.classList.toggle('reduce-motion', reduceMotion);
  }, [reduceMotion]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'AudioVolumeUp') {
        setMuted(false);
        setVolume((v) => Math.min(1, v + 0.05));
      } else if (e.key === 'AudioVolumeDown') {
        setMuted(false);
        setVolume((v) => Math.max(0, v - 0.05));
      } else if (e.key === 'AudioVolumeMute') {
        setMuted((m) => !m);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [setVolume, setMuted]);

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
      <div className="px-4 pb-2">
        <div className="flex items-center mb-2">
          <button
            aria-label={muted ? 'Unmute' : 'Mute'}
            className="mr-2 px-2 py-1 border rounded"
            onClick={() => setMuted(!muted)}
          >
            {muted ? 'Unmute' : 'Mute'}
          </button>
          <div className="flex-1">
            <label htmlFor="qs-volume" className="sr-only">
              Volume
            </label>
            <input
              id="qs-volume"
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={muted ? 0 : volume}
              onChange={(e) => {
                setMuted(false);
                setVolume(parseFloat(e.target.value));
              }}
              className="w-full"
              aria-label="Volume"
            />
          </div>
        </div>
        <div className="mb-2">
          <label htmlFor="qs-device" className="block text-sm mb-1">
            Output device
          </label>
          <select
            id="qs-device"
            value={device}
            onChange={(e) => {
              const d = e.target.value;
              setDevice(d);
              setProfile(d === 'headphones' ? 'Bass Boost' : 'Stereo');
            }}
            className="w-full mb-1"
          >
            <option value="speakers">Speakers</option>
            <option value="headphones">Headphones</option>
            <option value="hdmi">HDMI Output</option>
          </select>
          <label htmlFor="qs-profile" className="sr-only">
            Profile
          </label>
          <select
            id="qs-profile"
            value={profile}
            onChange={(e) => setProfile(e.target.value)}
            className="w-full"
          >
            {device === 'headphones' ? (
              <>
                <option value="Bass Boost">Bass Boost</option>
                <option value="Stereo">Stereo</option>
              </>
            ) : (
              <>
                <option value="Stereo">Stereo</option>
                <option value="Surround">Surround</option>
              </>
            )}
          </select>
        </div>
        <Link href="/apps/pavucontrol" className="text-blue-400 underline">
          Sound settings
        </Link>
      </div>
      <div className="px-4 pb-2 flex justify-between">
        <span>Network</span>
          <input
            type="checkbox"
            checked={online}
            onChange={() => setOnline(!online)}
            aria-label="Network"
          />
      </div>
      <div className="px-4 flex justify-between">
        <span>Reduced motion</span>
        <input
          type="checkbox"
          checked={reduceMotion}
          onChange={() => setReduceMotion(!reduceMotion)}
          aria-label="Reduced motion"
        />
      </div>
    </div>
  );
};

export default QuickSettings;
