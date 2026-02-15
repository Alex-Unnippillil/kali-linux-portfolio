import React from 'react';

const Modal: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="absolute inset-0 z-20 flex items-center justify-center bg-slate-950/70 p-4">
    <div className="w-full max-w-sm rounded-xl bg-slate-900 p-4 text-slate-100 shadow-xl">{children}</div>
  </div>
);

export const WinModal: React.FC<{ score: number; onNext: () => void }> = ({ score, onNext }) => (
  <Modal>
    <h3 className="text-lg font-semibold">Level Complete</h3>
    <p className="mt-2">Score: {score}</p>
    <button className="mt-4 rounded bg-emerald-600 px-3 py-1" onClick={onNext} type="button">Next Level</button>
  </Modal>
);

export const LoseModal: React.FC<{ onRetry: () => void }> = ({ onRetry }) => (
  <Modal>
    <h3 className="text-lg font-semibold">Out of moves</h3>
    <button className="mt-4 rounded bg-amber-600 px-3 py-1" onClick={onRetry} type="button">Retry</button>
  </Modal>
);

export const RulesModal: React.FC<{ onClose: () => void }> = ({ onClose }) => (
  <Modal>
    <h3 className="text-lg font-semibold">Rules</h3>
    <ul className="mt-2 list-disc space-y-1 pl-4 text-sm">
      <li>Match 3+ candies to clear and cascade.</li>
      <li>Line 4 creates striped; T/L 5 creates wrapped; line 5 creates color bomb.</li>
      <li>Striped+striped clears row + column, wrapped+wrapped clears 5x5.</li>
      <li>Color bomb + color clears that color. Color bomb + bomb clears board.</li>
    </ul>
    <button className="mt-4 rounded bg-slate-700 px-3 py-1" onClick={onClose} type="button">Close</button>
  </Modal>
);
