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

const SUIT_COLOR_CLASSES: Record<Suit, string> = {
  '♠': 'text-[color:var(--color-severity-low)]',
  '♣': 'text-[color:var(--color-severity-medium)]',
  '♥': 'text-[color:var(--color-severity-critical)]',
  '♦': 'text-[color:var(--color-severity-high)]',
};

const FACE_DOWN_CLASS =
  'text-[color:color-mix(in_srgb,var(--kali-text)_35%,transparent)]';

const CONTROL_CLASSES =
  'rounded border border-[color:var(--kali-border)] bg-[var(--kali-panel)] px-2 py-1 text-sm text-[color:var(--kali-text)] transition hover:border-[color:color-mix(in_srgb,var(--kali-control)_60%,var(--kali-border))] hover:bg-[color-mix(in_srgb,var(--kali-control)_14%,var(--kali-panel))] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-kali-focus';

const BUTTON_CLASSES = `${CONTROL_CLASSES} font-semibold`;

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

  const renderPile = (pile: Card[], key: number) => (
    <div
      key={key}
      className="min-w-[60px] rounded border border-[color:var(--kali-border)] bg-[var(--kali-panel)] p-1 text-[color:var(--kali-text)] shadow-inner shadow-black/30"
    >
      {pile.map((card, idx) => {
        const textClass = card.faceDown
          ? FACE_DOWN_CLASS
          : SUIT_COLOR_CLASSES[card.suit];
        return (
          <div key={idx} className={textClass}>
            {cardToString(card)}
          </div>
        );
      })}
    </div>
  );

  return (
    <div className="p-4 text-[color:var(--kali-text)]">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <label htmlFor="draw-mode" className="text-sm text-[color:var(--kali-text)]">
          Draw:
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
          className={CONTROL_CLASSES}
        >
          <option value="draw1">1</option>
          <option value="draw3">3</option>
        </select>
        <button type="button" onClick={onDraw} className={BUTTON_CLASSES}>
          Draw
        </button>
        <button type="button" onClick={onAutoMove} className={BUTTON_CLASSES}>
          Auto Move
        </button>
        <button type="button" onClick={onHint} className={BUTTON_CLASSES}>
          Hint
        </button>
        <button type="button" onClick={onReset} className={BUTTON_CLASSES}>
          Reset
        </button>
      </div>
      <div className="mb-4 flex gap-4">
        <div>
          <h3 className="font-bold">Stock ({state.stock.length})</h3>
        </div>
        <div>
          <h3 className="font-bold">Waste</h3>
          {renderPile(state.waste, -1)}
        </div>
      </div>
      <div className="mb-4 flex gap-4">
        {( ['♠','♥','♦','♣'] as Suit[]).map((suit) => (
          <div key={suit}>
            <h3 className="font-bold">{suit}</h3>
            {renderPile(state.foundations[suit], suit.charCodeAt(0))}
          </div>
        ))}
      </div>
      <div className="flex gap-2 overflow-x-auto">
        {state.tableau.map((pile, idx) => (
          <div key={idx}>
            <h3 className="text-center font-bold">{idx + 1}</h3>
            {renderPile(pile, idx)}
          </div>
        ))}
      </div>
      {hint && <p className="mt-4">Hint: {hint}</p>}
    </div>
  );
};

export default Solitaire;

