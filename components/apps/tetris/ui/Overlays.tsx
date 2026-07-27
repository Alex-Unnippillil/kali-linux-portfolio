import React from 'react';

interface Props {
  status: 'idle' | 'playing' | 'paused' | 'gameover';
  showHelp: boolean;
  onStart: () => void;
  onRestart: () => void;
}

const Overlays: React.FC<Props> = ({ status, showHelp, onStart, onRestart }) => {
  if (showHelp) {
    return (
      <div className="absolute inset-0 z-20 flex items-center justify-center bg-slate-950/85 p-4">
        <div className="max-w-md rounded border border-slate-700 bg-slate-900 p-4 text-sm text-slate-100">
          <h3 className="mb-2 text-base font-semibold text-sky-300">Controls</h3>
          <ul className="list-disc space-y-1 pl-4">
            <li>Move: Left / Right with DAS + ARR</li>
            <li>Rotate: CW / CCW / optional 180°</li>
            <li>Soft Drop and Hard Drop</li>
            <li>Hold once per tetromino</li>
            <li>P to pause, R to restart, O for settings</li>
          </ul>
        </div>
      </div>
    );
  }

  if (status === 'idle') {
    return (
      <div className="absolute inset-0 z-20 flex items-center justify-center bg-slate-950/70">
        <button type="button" onClick={onStart} className="rounded border border-sky-400 bg-sky-500/20 px-4 py-2 text-sm font-semibold text-sky-100" aria-label="Start Tetris game">Start Game</button>
      </div>
    );
  }

  if (status === 'paused') {
    return (
      <div className="absolute inset-0 z-20 flex items-center justify-center bg-slate-950/75">
        <div className="rounded border border-slate-700 bg-slate-900 px-4 py-3 text-slate-100">Paused</div>
      </div>
    );
  }

  if (status === 'gameover') {
    return (
      <div className="absolute inset-0 z-20 flex items-center justify-center bg-slate-950/80">
        <div className="rounded border border-rose-500 bg-slate-900 p-4 text-center">
          <p className="mb-2 text-rose-300">Game Over</p>
          <button type="button" onClick={onRestart} className="rounded border border-rose-300 px-3 py-1 text-sm text-rose-100" aria-label="Restart Tetris game">Restart</button>
        </div>
      </div>
    );
  }

  return null;
};

export default React.memo(Overlays);
