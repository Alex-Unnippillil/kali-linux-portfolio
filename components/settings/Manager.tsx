'use client';

import { useState, useRef } from 'react';
import { diffJson, Change } from 'diff';
import { exportSettings as exportSettingsData, importSettings as importSettingsData } from '../../utils/settingsStore';
import { getAll as getModules, clearStore, setValue as setModuleValue } from '../../utils/moduleStore';
import { useSettings } from '../../hooks/useSettings';

interface BackupData {
  settings: any;
  modules: Record<string, string>;
}

export default function Manager() {
  const fileRef = useRef<HTMLInputElement>(null);
  const [diff, setDiff] = useState<Change[] | null>(null);
  const [pending, setPending] = useState<BackupData | null>(null);

  const settingsCtx = useSettings();

  const handleExportAll = async () => {
    const settings = JSON.parse(await exportSettingsData());
    const modules = getModules();
    const blob = new Blob(
      [JSON.stringify({ settings, modules }, null, 2)],
      { type: 'application/json' },
    );
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'backup.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  const openFile = () => fileRef.current?.click();

  const handleFile = async (file: File) => {
    const text = await file.text();
    let data: BackupData;
    try {
      data = JSON.parse(text);
    } catch (e) {
      console.error('Invalid backup', e);
      return;
    }
    const current: BackupData = {
      settings: JSON.parse(await exportSettingsData()),
      modules: getModules(),
    };
    setDiff(diffJson(current, data));
    setPending(data);
  };

  const applyRestore = async () => {
    if (!pending) return;
    await importSettingsData(pending.settings);
    const map: Record<string, (v: any) => void> = {
      accent: settingsCtx.setAccent,
      wallpaper: settingsCtx.setWallpaper,
      density: settingsCtx.setDensity as any,
      reducedMotion: settingsCtx.setReducedMotion,
      fontScale: settingsCtx.setFontScale,
      highContrast: settingsCtx.setHighContrast,
      largeHitAreas: settingsCtx.setLargeHitAreas,
      pongSpin: settingsCtx.setPongSpin,
      allowNetwork: settingsCtx.setAllowNetwork,
      haptics: settingsCtx.setHaptics,
      theme: settingsCtx.setTheme,
    };
    Object.entries(map).forEach(([key, setter]) => {
      if (pending.settings && pending.settings[key] !== undefined) {
        setter(pending.settings[key]);
      }
    });
    clearStore();
    if (pending.modules) {
      Object.entries(pending.modules).forEach(([k, v]) => setModuleValue(k, v));
    }
    setDiff(null);
    setPending(null);
  };

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <button
          onClick={handleExportAll}
          className="px-2 py-1 bg-ub-orange text-black rounded"
        >
          Export All
        </button>
        <button
          onClick={openFile}
          className="px-2 py-1 bg-ub-green text-black rounded"
        >
          Restore
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="application/json"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            e.target.value = '';
            if (f) handleFile(f);
          }}
        />
      </div>
      {diff && (
        <div className="bg-black text-xs p-2 overflow-auto">
          <pre aria-label="diff-preview">
            {diff.map((part, i) => (
              <span
                key={i}
                style={{
                  color: part.added ? '#9fff9f' : part.removed ? '#ff9f9f' : '#ffffff',
                  backgroundColor: part.added
                    ? '#003a00'
                    : part.removed
                    ? '#3a0000'
                    : 'transparent',
                }}
              >
                {part.value}
              </span>
            ))}
          </pre>
          <button
            onClick={applyRestore}
            className="mt-2 px-2 py-1 bg-ub-orange text-black rounded"
          >
            Apply Restore
          </button>
        </div>
      )}
    </div>
  );
}

