import type { PinballSettings } from '../types';

export function SettingsPanel({ settings, onChange }: { settings: PinballSettings; onChange: (next: PinballSettings) => void; }) {
  return (
    <div className="flex flex-wrap items-center gap-3 text-xs text-white">
      <label className="flex items-center gap-1">
        <input aria-label="Reduced motion" type="checkbox" checked={settings.reducedMotion} onChange={(e) => onChange({ ...settings, reducedMotion: e.target.checked })} />
        Reduced motion
      </label>
      <label className="flex items-center gap-1">
        <input aria-label="Mute" type="checkbox" checked={settings.muted} onChange={(e) => onChange({ ...settings, muted: e.target.checked })} />
        Mute
      </label>
      <label className="flex items-center gap-2">
        Volume
        <input aria-label="Master volume" type="range" min="0" max="1" step="0.05" value={settings.masterVolume} onChange={(e) => onChange({ ...settings, masterVolume: Number(e.target.value) })} />
      </label>
    </div>
  );
}
