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

  const renderPile = (pile: Card[], key: number) => (
    <div key={key} className="min-w-[60px] rounded border p-1">
      {pile.map((card, idx) => (
        <div
          key={idx}
          className={card.faceDown ? 'text-gray-400' : ''}
        >
          {cardToString(card)}
        </div>
      ))}
    </div>
  );

  return (
    <div className="p-4">
      <div className="mb-2 flex gap-2">
        <label htmlFor="draw-mode">Draw:</label>
        <select
          id="draw-mode"
          value={state.drawMode}
          onChange={(e) => {
            const mode = e.target.value as 'draw1' | 'draw3';
            setDrawMode(state, mode);
            localStorage.setItem('solitaire-mode', mode);
            refresh();
          }}
          className="rounded border p-1"
        >
          <option value="draw1">1</option>
          <option value="draw3">3</option>
        </select>
        <button type="button" onClick={onDraw} className="rounded border px-2">
          Draw
        </button>
        <button type="button" onClick={onAutoMove} className="rounded border px-2">
          Auto Move
        </button>
        <button type="button" onClick={onHint} className="rounded border px-2">
          Hint
        </button>
        <button type="button" onClick={onReset} className="rounded border px-2">
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

