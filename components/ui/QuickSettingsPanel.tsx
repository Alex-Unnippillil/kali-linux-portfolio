"use client";

import { useEffect, useMemo, useRef } from 'react';
import type { RefObject } from 'react';
import { useSettings } from '../../hooks/useSettings';

interface QuickSettingsPanelProps {
  open: boolean;
  onClose: () => void;
  anchorRef: RefObject<HTMLElement>;
}

const FONT_SCALE_MIN = 0.75;
const FONT_SCALE_MAX = 1.5;
const FONT_SCALE_STEP = 0.05;

const QuickSettingsPanel = ({ open, onClose, anchorRef }: QuickSettingsPanelProps) => {
  const {
    reducedMotion,
    setReducedMotion,
    highContrast,
    setHighContrast,
    largeHitAreas,
    setLargeHitAreas,
    fontScale,
    setFontScale,
    density,
    setDensity,
  } = useSettings();
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      const panelNode = panelRef.current;
      const anchorNode = anchorRef.current;
      if (!panelNode || panelNode.contains(target)) return;
      if (anchorNode && anchorNode.contains(target)) return;
      onClose();
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [anchorRef, onClose, open]);

  useEffect(() => {
    if (!open) return;
    const node = panelRef.current;
    if (!node) return;
    const focusable = node.querySelector<HTMLElement>('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
    focusable?.focus();
  }, [open]);

  const fontScaleLabel = useMemo(() => `${Math.round(fontScale * 100)}%`, [fontScale]);

  const toggleItems = [
    {
      id: 'reduced-motion',
      label: 'Reduced motion',
      description: 'Minimize animations',
      value: reducedMotion,
      onToggle: () => setReducedMotion(!reducedMotion),
    },
    {
      id: 'high-contrast',
      label: 'High contrast',
      description: 'Boost UI contrast',
      value: highContrast,
      onToggle: () => setHighContrast(!highContrast),
    },
    {
      id: 'large-hit-areas',
      label: 'Large hit areas',
      description: 'Bigger tap targets',
      value: largeHitAreas,
      onToggle: () => setLargeHitAreas(!largeHitAreas),
    },
  ];

  const densityOptions: Array<{ value: 'regular' | 'compact'; label: string }> = [
    { value: 'regular', label: 'Regular' },
    { value: 'compact', label: 'Compact' },
  ];

  const handleOpenSettings = () => {
    onClose();
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('open-app', { detail: 'settings' }));
    }
  };

  if (!open) return null;

  return (
    <div
      ref={panelRef}
      role="dialog"
      aria-label="Quick settings"
      className="absolute right-0 top-full mt-2 w-80 rounded-2xl border border-white/10 bg-[#0b1220]/95 p-4 text-white shadow-2xl backdrop-blur-xl"
    >
      <div className="mb-3 flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-white">Quick settings</p>
          <p className="text-xs text-white/60">Fast access to display controls</p>
        </div>
        <button
          type="button"
          onClick={handleOpenSettings}
          className="rounded-full border border-white/10 bg-white/10 px-3 py-1 text-xs text-white/80 transition hover:border-white/30 hover:bg-white/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300"
        >
          Settings
        </button>
      </div>
      <div className="grid gap-2">
        {toggleItems.map((item) => (
          <button
            key={item.id}
            type="button"
            role="switch"
            aria-label={`${item.label}: ${item.value ? 'On' : 'Off'}`}
            aria-checked={item.value}
            onClick={item.onToggle}
            className={`flex w-full items-center justify-between rounded-xl border px-3 py-2 text-left text-sm transition focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300 ${
              item.value
                ? 'border-cyan-400/60 bg-cyan-500/10 text-white'
                : 'border-white/10 bg-white/5 text-white/70'
            }`}
          >
            <span>
              <span className="block font-medium">{item.label}</span>
              <span className="block text-xs text-white/60">{item.description}</span>
            </span>
            <span
              aria-hidden="true"
              className={`h-5 w-9 rounded-full border transition ${
                item.value ? 'border-cyan-300/60 bg-cyan-400/40' : 'border-white/20 bg-white/10'
              }`}
            >
              <span
                className={`block h-4 w-4 translate-y-0.5 rounded-full bg-white transition ${
                  item.value ? 'translate-x-[1.05rem]' : 'translate-x-0.5'
                }`}
              />
            </span>
          </button>
        ))}
      </div>
      <div className="mt-3 rounded-xl border border-white/10 bg-white/5 p-3">
        <div className="flex items-center justify-between text-xs text-white/70">
          <label htmlFor="quick-settings-font-scale">Font size</label>
          <span className="text-white/80">{fontScaleLabel}</span>
        </div>
        <input
          id="quick-settings-font-scale"
          type="range"
          min={FONT_SCALE_MIN}
          max={FONT_SCALE_MAX}
          step={FONT_SCALE_STEP}
          value={fontScale}
          onChange={(event) => setFontScale(parseFloat(event.target.value))}
          className="mt-2 w-full accent-cyan-300"
          aria-label="Adjust font size"
        />
      </div>
      <div className="mt-3 rounded-xl border border-white/10 bg-white/5 p-3">
        <p className="text-xs text-white/70">Density</p>
        <div role="radiogroup" aria-label="Density" className="mt-2 grid grid-cols-2 gap-2">
          {densityOptions.map((option) => (
            <button
              key={option.value}
              type="button"
              role="radio"
              aria-checked={density === option.value}
              onClick={() => setDensity(option.value)}
              className={`rounded-lg border px-3 py-2 text-xs font-medium transition focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300 ${
                density === option.value
                  ? 'border-cyan-300/60 bg-cyan-500/20 text-white'
                  : 'border-white/10 bg-white/5 text-white/70'
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default QuickSettingsPanel;
