import React from 'react';
import { KeyBindings } from '../input/useTetrisInput';

interface Props {
  visible: boolean;
  keyBindings: KeyBindings;
  onCapture: (key: keyof KeyBindings) => void;
  captureTarget: keyof KeyBindings | null;
  ghostPiece: boolean;
  gridlines: boolean;
  sound: boolean;
  allowRotate180: boolean;
  dasMs: number;
  arrMs: number;
  setDasMs: (value: number) => void;
  setArrMs: (value: number) => void;
  onToggle: (setting: 'ghostPiece' | 'gridlines' | 'sound' | 'allowRotate180') => void;
}

const Toggle: React.FC<{ label: string; value: boolean; onClick: () => void }> = ({ label, value, onClick }) => (
  <button type="button" onClick={onClick} className="flex items-center justify-between rounded border border-slate-700 bg-slate-900 px-2 py-1 text-sm" aria-label={`${label} toggle`}>
    <span>{label}</span>
    <span className={value ? 'text-emerald-300' : 'text-slate-400'}>{value ? 'On' : 'Off'}</span>
  </button>
);

const SettingsPanel: React.FC<Props> = (props) => {
  if (!props.visible) return null;

  return (
    <section className="absolute inset-2 z-30 overflow-auto rounded-lg border border-sky-700 bg-slate-950/95 p-3 text-slate-100" aria-label="Tetris settings panel">
      <h2 className="mb-2 text-sm font-semibold uppercase tracking-widest text-sky-300">Settings</h2>

      <div className="mb-3 grid grid-cols-2 gap-2">
        <Toggle label="Ghost" value={props.ghostPiece} onClick={() => props.onToggle('ghostPiece')} />
        <Toggle label="Grid" value={props.gridlines} onClick={() => props.onToggle('gridlines')} />
        <Toggle label="Sound" value={props.sound} onClick={() => props.onToggle('sound')} />
        <Toggle label="180°" value={props.allowRotate180} onClick={() => props.onToggle('allowRotate180')} />
      </div>

      <div className="mb-3 grid grid-cols-2 gap-2 text-sm">
        <label className="flex flex-col gap-1">
          DAS (ms)
          <input aria-label="DAS milliseconds" type="number" className="rounded border border-slate-700 bg-slate-900 px-2 py-1" value={props.dasMs} min={40} max={350} onChange={(event) => props.setDasMs(Number(event.target.value))} />
        </label>
        <label className="flex flex-col gap-1">
          ARR (ms)
          <input aria-label="ARR milliseconds" type="number" className="rounded border border-slate-700 bg-slate-900 px-2 py-1" value={props.arrMs} min={0} max={120} onChange={(event) => props.setArrMs(Number(event.target.value))} />
        </label>
      </div>

      <div className="space-y-1">
        <h3 className="text-xs uppercase tracking-widest text-slate-300">Keybinds</h3>
        {Object.entries(props.keyBindings).map(([name, key]) => (
          <button
            key={name}
            type="button"
            onClick={() => props.onCapture(name as keyof KeyBindings)}
            className="flex w-full items-center justify-between rounded border border-slate-700 bg-slate-900 px-2 py-1 text-sm"
            aria-label={`Remap ${name}`}
          >
            <span>{name}</span>
            <span className="font-mono text-sky-200">{props.captureTarget === name ? 'Press key…' : key}</span>
          </button>
        ))}
      </div>
    </section>
  );
};

export default React.memo(SettingsPanel);
