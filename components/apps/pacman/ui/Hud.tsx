import React from 'react';

interface HudProps {
  mode: string;
  pellets: number;
  levelLabel: string;
  statusMessage: string;
}

const Hud: React.FC<HudProps> = ({ mode, pellets, levelLabel, statusMessage }) => (
  <div className="mt-3 flex flex-wrap items-center justify-center gap-3 px-3 pb-3 text-xs text-slate-200">
    <div className="rounded bg-slate-900/70 px-2 py-1">Mode: {mode === 'fright' ? 'Frightened' : mode}</div>
    <div className="rounded bg-slate-900/70 px-2 py-1">Pellets: {pellets}</div>
    <div className="rounded bg-slate-900/70 px-2 py-1">Level: {levelLabel}</div>
    {statusMessage && <div className="rounded bg-amber-500/80 px-2 py-1 text-slate-900">{statusMessage}</div>}
  </div>
);

export default Hud;
