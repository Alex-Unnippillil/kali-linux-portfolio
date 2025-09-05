"use client";

import React, { useState } from 'react';
import usePersistentState from '../../hooks/usePersistentState';
import { captureScreenshot, ScreenshotMode } from '../../utils/screenshot';

const modes: ScreenshotMode[] = ['region', 'window', 'full'];

export default function ScreenshotApp() {
  const [mode, setMode] = useState<ScreenshotMode>('region');
  const [delay, setDelay] = usePersistentState<number>(
    'screenshot-delay',
    0,
    (v): v is number => typeof v === 'number',
  );
  const [includePointer, setIncludePointer] = usePersistentState<boolean>(
    'screenshot-pointer',
    false,
    (v): v is boolean => typeof v === 'boolean',
  );
  const [imageUrl, setImageUrl] = useState<string | null>(null);

  const cycleMode = (deltaY: number) => {
    let idx = modes.indexOf(mode);
    if (deltaY > 0) idx = (idx + 1) % modes.length;
    else idx = (idx - 1 + modes.length) % modes.length;
    setMode(modes[idx]);
  };

  const capture = async () => {
    const blob = await captureScreenshot({ mode, delay, includePointer });
    if (blob) {
      const url = URL.createObjectURL(blob);
      setImageUrl(url);
    }
  };

  const copy = async () => {
    if (!imageUrl) return;
    const blob = await (await fetch(imageUrl)).blob();
    try {
      await navigator.clipboard.write([
        new (window as any).ClipboardItem({ 'image/png': blob }),
      ]);
    } catch {
      /* ignore */
    }
  };

  const openWith = () => {
    if (imageUrl) window.open(imageUrl);
  };

  return (
    <div className="h-full w-full p-4 bg-ub-cool-grey text-white space-y-4 overflow-auto">
      <div
        onWheel={(e) => cycleMode(e.deltaY)}
        className="select-none cursor-pointer"
        aria-label="capture-mode"
      >
        Mode: {mode.charAt(0).toUpperCase() + mode.slice(1)} (scroll to change)
      </div>
      <div className="flex items-center space-x-2">
        <label htmlFor="delay">Delay (s):</label>
        <input
          id="delay"
          type="number"
          value={delay}
          onChange={(e) => setDelay(parseInt(e.target.value, 10) || 0)}
          className="bg-ub-dark bg-opacity-50 p-1 rounded w-16"
        />
      </div>
      <label className="flex items-center space-x-2">
        <input
          type="checkbox"
          checked={includePointer}
          onChange={(e) => setIncludePointer(e.target.checked)}
        />
        <span>Include pointer</span>
      </label>
      <button
        type="button"
        onClick={capture}
        className="px-4 py-2 bg-ub-dracula rounded"
      >
        Capture
      </button>
      {imageUrl && (
        <div className="space-y-2">
          <img src={imageUrl} alt="Screenshot" className="max-w-full border" />
          <div className="space-x-2">
            <button
              type="button"
              onClick={copy}
              className="px-4 py-2 bg-ub-green text-black rounded"
            >
              Copy to Clipboard
            </button>
            <button
              type="button"
              onClick={openWith}
              className="px-4 py-2 bg-ub-orange rounded"
            >
              Open With
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export const displayScreenshot = () => <ScreenshotApp />;

