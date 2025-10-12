'use client';

import { useState } from 'react';
import type { GameState } from '../games/solitaire/logic';
import {
  initGame,
  draw,
  autoMove,
  getHint,
  cardToString,
  Suit,
  Card,
  setDrawMode,
} from '../games/solitaire/logic';

const Solitaire = () => {
  const getStoredMode = (): 'draw1' | 'draw3' => {
    if (typeof window === 'undefined') return 'draw1';
    return (localStorage.getItem('solitaire-mode') as 'draw1' | 'draw3' | null) || 'draw1';
  };

  const [state, setState] = useState<GameState>(() => initGame(getStoredMode()));
  const [hint, setHint] = useState<string | null>(null);

  const refresh = () => setState({ ...state });

  const onDraw = () => {
    draw(state);
    refresh();
  };

  const onReset = () => {
    setState(initGame(state.drawMode));
    setHint(null);
  };

  const onAutoMove = () => {
    autoMove(state);
    refresh();
  };

  const onHint = () => {
    setHint(getHint(state));
  };

  const renderCard = (card: Card, idx: number) => {
    const isRed = card.suit === '♥' || card.suit === '♦';
    return (
      <div
        key={`${card.suit}-${card.rank}-${idx}`}
        className={`flex h-20 w-14 items-center justify-center rounded-lg border text-sm font-semibold tracking-tight transition-colors duration-150 ${
          card.faceDown
            ? 'border-slate-700 bg-slate-800 text-slate-500'
            : 'border-slate-200 bg-white text-slate-900 shadow-lg'
        }`}
      >
        {card.faceDown ? (
          <span className="sr-only">{cardToString(card)}</span>
        ) : (
          <span className={isRed ? 'text-red-600' : 'text-slate-900'}>
            {cardToString(card)}
          </span>
        )}
      </div>
    );
  };

  const renderPile = (pile: Card[], key: number) => (
    <div
      key={key}
      className="flex min-h-[120px] min-w-[84px] flex-col items-center gap-2 rounded-xl border border-slate-700 bg-slate-900/40 p-3 shadow-inner"
    >
      {pile.length === 0 ? (
        <div className="flex h-20 w-14 items-center justify-center rounded-lg border-2 border-dashed border-slate-700 text-xs text-slate-500">
          Empty
        </div>
      ) : (
        <div className="flex flex-col items-center gap-2" aria-live="polite">
          {pile.map((card, idx) => renderCard(card, idx))}
        </div>
      )}
    </div>
  );

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-4">
      <div className="flex flex-wrap items-center gap-2 rounded-xl border border-slate-800 bg-slate-900/70 p-3 shadow-lg shadow-slate-900/20">
        <label htmlFor="draw-mode" className="text-sm font-medium text-slate-200">
          Draw mode
        </label>
        <select
          id="draw-mode"
          value={state.drawMode}
          onChange={(e) => {
            const mode = e.target.value as 'draw1' | 'draw3';
            setDrawMode(state, mode);
            localStorage.setItem('solitaire-mode', mode);
            refresh();
          }}
          className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-1 text-sm text-slate-100 focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-400/40"
        >
          <option value="draw1">1</option>
          <option value="draw3">3</option>
        </select>
        <button
          type="button"
          onClick={onDraw}
          className="rounded-lg border border-emerald-500/60 bg-emerald-500/10 px-3 py-1 text-sm font-semibold text-emerald-200 transition hover:bg-emerald-500/20"
        >
          Draw
        </button>
        <button
          type="button"
          onClick={onAutoMove}
          className="rounded-lg border border-indigo-500/60 bg-indigo-500/10 px-3 py-1 text-sm font-semibold text-indigo-200 transition hover:bg-indigo-500/20"
        >
          Auto Move
        </button>
        <button
          type="button"
          onClick={onHint}
          className="rounded-lg border border-amber-500/60 bg-amber-500/10 px-3 py-1 text-sm font-semibold text-amber-200 transition hover:bg-amber-500/20"
        >
          Hint
        </button>
        <button
          type="button"
          onClick={onReset}
          className="rounded-lg border border-rose-500/60 bg-rose-500/10 px-3 py-1 text-sm font-semibold text-rose-200 transition hover:bg-rose-500/20"
        >
          Reset
        </button>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 shadow-inner">
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-400">
            Stock
          </h3>
          <div className="text-2xl font-bold text-slate-100">{state.stock.length}</div>
          <p className="mt-1 text-xs text-slate-400">Cards remaining</p>
        </div>
        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 shadow-inner">
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-400">
            Waste
          </h3>
          <div className="flex justify-center">
            {renderPile(state.waste, -1)}
          </div>
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {(['♠', '♥', '♦', '♣'] as Suit[]).map((suit) => (
          <div
            key={suit}
            className="flex flex-col items-center gap-3 rounded-xl border border-slate-800 bg-slate-900/60 p-4 shadow-inner"
          >
            <h3 className="text-lg font-semibold text-slate-100">{suit}</h3>
            {renderPile(state.foundations[suit], suit.charCodeAt(0))}
          </div>
        ))}
      </div>
      <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4 shadow-xl shadow-slate-900/30">
        <h2 className="mb-4 text-center text-sm font-semibold uppercase tracking-wider text-slate-400">
          Tableau
        </h2>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7">
          {state.tableau.map((pile, idx) => (
            <div key={idx} className="flex flex-col items-center gap-3">
              <h3 className="text-sm font-semibold text-slate-300">Pile {idx + 1}</h3>
              {renderPile(pile, idx)}
            </div>
          ))}
        </div>
      </div>
      {hint && (
        <div
          className="rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-100 shadow-lg"
          role="status"
          aria-live="polite"
        >
          <strong className="font-semibold">Hint:</strong> {hint}
        </div>
      )}
    </div>
  );
};

export default Solitaire;

