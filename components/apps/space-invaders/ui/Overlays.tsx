import React from 'react';

interface OverlayProps {
  title: string;
  body: React.ReactNode;
  cta: string;
  onCta: () => void;
}

const Overlay: React.FC<OverlayProps> = ({ title, body, cta, onCta }) => (
  <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/70">
    <div className="space-y-3 rounded border border-slate-700 bg-slate-900/90 p-4 text-sm text-slate-100 max-w-sm">
      <h2 className="text-lg font-semibold">{title}</h2>
      <div className="text-slate-200">{body}</div>
      <button
        type="button"
        onClick={onCta}
        className="rounded bg-emerald-400 px-3 py-1.5 font-semibold text-black"
      >
        {cta}
      </button>
    </div>
  </div>
);

export const StartOverlay: React.FC<{ onStart: () => void }> = ({ onStart }) => (
  <Overlay
    title="Space Invaders"
    body={(
      <>
        <p>Defend the line and clear waves of invaders.</p>
        <p className="mt-2 text-xs text-slate-400">Controls: A/D or ←/→ move, Space shoot, P pause.</p>
      </>
    )}
    cta="Start"
    onCta={onStart}
  />
);

export const PauseOverlay: React.FC<{ onResume: () => void }> = ({ onResume }) => (
  <Overlay title="Paused" body={<p>Game is paused.</p>} cta="Resume" onCta={onResume} />
);

export const GameOverOverlay: React.FC<{
  score: number;
  highScore: number;
  onRestart: () => void;
}> = ({ score, highScore, onRestart }) => (
  <Overlay
    title="Game Over"
    body={
      <>
        <p>Score: {score}</p>
        <p>High Score: {highScore}</p>
      </>
    }
    cta="Restart"
    onCta={onRestart}
  />
);
