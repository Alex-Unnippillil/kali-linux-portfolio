"use client";

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { useSettings } from '../../hooks/useSettings';

const icon = {
  good: '/themes/Yaru/status/battery-good-symbolic.svg',
  low: '/themes/Yaru/status/battery-low-symbolic.svg',
  charging: '/themes/Yaru/status/battery-good-charging-symbolic.svg',
};

export default function Battery() {
  const { brightness, setBrightness, presentationMode, setPresentationMode } = useSettings();
  const [open, setOpen] = useState(false);
  const [level, setLevel] = useState(1);
  const [charging, setCharging] = useState(false);

  useEffect(() => {
    let battery: any;
    const handler = () => {
      setLevel(battery.level);
      setCharging(battery.charging);
    };
    if ('getBattery' in navigator) {
      // @ts-ignore
      navigator.getBattery().then((b) => {
        battery = b;
        handler();
        b.addEventListener('levelchange', handler);
        b.addEventListener('chargingchange', handler);
      });
    }
    return () => {
      if (battery) {
        battery.removeEventListener('levelchange', handler);
        battery.removeEventListener('chargingchange', handler);
      }
    };
  }, []);

  const pct = Math.round(level * 100);
  let src = icon.good;
  if (charging) {
    src = icon.charging;
  } else if (pct < 20) {
    src = icon.low;
  }

  return (
    <div className="relative">
      <button
        aria-label="battery"
        className="mx-1.5"
        onClick={() => setOpen(!open)}
      >
        <span className="relative inline-block">
          <Image
            width={16}
            height={16}
            src={src}
            alt="battery"
            className="inline status-symbol w-4 h-4"
            sizes="16px"
          />
          {presentationMode && (
            <span className="absolute -top-1 -right-1 w-2 h-2 bg-green-500 rounded-full" />
          )}
        </span>
      </button>
      {open && (
        <div className="absolute right-0 mt-2 w-48 p-2 rounded bg-[var(--color-surface)] text-sm shadow">
          <div className="mb-2">
            Battery: {pct}% {charging && '⚡'}
          </div>
          <label className="flex items-center gap-2 mb-2">
            <span className="whitespace-nowrap">Brightness</span>
            <input
              type="range"
              min={0.5}
              max={1}
              step={0.01}
              value={brightness}
              onChange={(e) => setBrightness(parseFloat(e.target.value))}
              className="ubuntu-slider flex-1"
              disabled={presentationMode}
            />
          </label>
          <label className="flex items-center justify-between">
            <span>Presentation Mode</span>
            <input
              type="checkbox"
              checked={presentationMode}
              onChange={(e) => setPresentationMode(e.target.checked)}
            />
          </label>
        </div>
      )}
    </div>
  );
}
