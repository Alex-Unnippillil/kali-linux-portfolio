import React, { useState, useEffect, useRef, useCallback } from 'react';
import ReactGA from 'react-ga4';
import {
  initializeGame,
  drawFromStock,
  moveTableauToTableau,
  moveWasteToTableau,
  moveToFoundation,
  autoMove,
  autoMoveHint,
  autoComplete,
  valueToString,
  GameState,
  Card,
  suits,
} from './engine';

const renderCard = (card: Card, highlight = false) => (
  <div
    className={`w-16 h-24 rounded border border-black bg-white flex items-center justify-center transition-transform duration-300 ${highlight ? 'ring-2 ring-yellow-400' : ''}`}
  >
    <span className={card.color === 'red' ? 'text-red-600' : ''}>
      {valueToString(card.value)}{card.suit}
    </span>
  </div>
);

const renderFaceDown = () => (
  <div className="w-16 h-24 rounded border border-black bg-blue-800" />
);

const Solitaire = () => {
  const [drawMode, setDrawMode] = useState<1 | 3>(1);
  const [passes, setPasses] = useState<number | null>(3);
  const [scoring, setScoring] = useState<'standard' | 'vegas'>('standard');
  const [game, setGame] = useState<GameState>(() => initializeGame(drawMode, undefined, { redeals: passes, scoring }));
  const [history, setHistory] = useState<GameState[]>([]);
  const [drag, setDrag] = useState<{ source: 'tableau' | 'waste'; pile: number; index: number } | null>(null);
  const [won, setWon] = useState(false);
  const [time, setTime] = useState(0);
  const [hint, setHint] = useState<ReturnType<typeof autoMoveHint> | null>(null);
  const timer = useRef<NodeJS.Timeout | null>(null);

    const start = useCallback(
      (mode: 1 | 3 = drawMode, seed?: number) => {
        setGame(initializeGame(mode, undefined, { redeals: passes, scoring, seed }));
        setWon(false);
        setTime(0);
        setHistory([]);
        const stats = JSON.parse(localStorage.getItem('solitaireStats') || '{"games":0,"wins":0}');
        stats.games += 1;
        localStorage.setItem('solitaireStats', JSON.stringify(stats));
      },
      [drawMode, passes, scoring]
    );

    useEffect(() => {
      start(drawMode);
    }, [drawMode, start]);

  useEffect(() => {
    if (won) {
      if (timer.current) clearInterval(timer.current);
      const best = JSON.parse(localStorage.getItem('solitaireBest') || '{}');
      if (!best.score || game.score > best.score) {
        localStorage.setItem('solitaireBest', JSON.stringify({ score: game.score, time }));
      }
      const stats = JSON.parse(localStorage.getItem('solitaireStats') || '{"games":0,"wins":0}');
      stats.wins += 1;
      localStorage.setItem('solitaireStats', JSON.stringify(stats));
      return;
    }
    timer.current = setInterval(() => setTime((t) => t + 1), 1000);
    return () => {
      if (timer.current) clearInterval(timer.current);
    };
    }, [won, game, time]);

  useEffect(() => {
    if (game.foundations.every((p) => p.length === 13)) {
      setWon(true);
      ReactGA.event({ category: 'Solitaire', action: 'win' });
    }
    setHint(autoMoveHint(game));
  }, [game]);

  const update = (fn: (g: GameState) => GameState) =>
    setGame((g) => {
      const n = fn(g);
      if (n !== g) {
        setHistory((h) => [...h, g]);
        ReactGA.event({ category: 'Solitaire', action: 'move', label: 'manual' });
      }
      return n;
    });

  const draw = () => update(drawFromStock);

  const handleDragStart = (source: 'tableau' | 'waste', pile: number, index: number) => {
    if (source === 'tableau') {
      const card = game.tableau[pile][index];
      if (!card.faceUp) return;
      setDrag({ source, pile, index });
    } else if (source === 'waste' && game.waste.length) {
      setDrag({ source, pile: -1, index: game.waste.length - 1 });
    }
  };

  const finishDrag = () => setDrag(null);

  const dropToTableau = (pileIndex: number) => {
    if (!drag) return;
    if (drag.source === 'tableau') {
      update((g) => moveTableauToTableau(g, drag.pile, drag.index, pileIndex));
    } else {
      update((g) => moveWasteToTableau(g, pileIndex));
    }
    finishDrag();
  };

  const dropToFoundation = (pileIndex: number) => {
    if (!drag) return;
    if (drag.source === 'tableau') {
      update((g) => moveToFoundation(g, 'tableau', drag.pile));
    } else {
      update((g) => moveToFoundation(g, 'waste', null));
    }
    finishDrag();
  };

  const handleDoubleClick = (source: 'tableau' | 'waste', pile: number) => {
    update((g) => autoMove(g, source, source === 'tableau' ? pile : null));
  };

  const best = JSON.parse(typeof window !== 'undefined' ? localStorage.getItem('solitaireBest') || '{}' : '{}');
  const stats = JSON.parse(typeof window !== 'undefined' ? localStorage.getItem('solitaireStats') || '{"games":0,"wins":0}' : '{"games":0,"wins":0}');

  const undo = () => {
    setHistory((h) => {
      if (h.length === 0) return h;
      const prev = h[h.length - 1];
      setGame(prev);
      return h.slice(0, -1);
    });
  };

  const dailyChallenge = () => {
    const today = Number(new Date().toISOString().slice(0, 10).replace(/-/g, ''));
    start(drawMode, today);
  };

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'u') undo();
      if (e.key === 'd') draw();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  });

  return (
    <div className="h-full w-full bg-green-700 text-white select-none p-2">
      {won && (
        <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 text-2xl">
          You win!
        </div>
      )}
      <div className="flex flex-wrap gap-2 mb-2 items-center justify-between">
        <div>Score: {game.score}</div>
        <div>Time: {time}s</div>
        <div>Redeals: {game.redeals === null ? '∞' : game.redeals}</div>
        <div>Best: {best.score ? `${best.score} (${best.time}s)` : 'N/A'}</div>
        <div>Wins: {stats.wins}/{stats.games}</div>
        <button
          className="px-2 py-1 bg-gray-700 hover:bg-gray-600 rounded"
          onClick={() => {
            const mode = drawMode === 1 ? 3 : 1;
            ReactGA.event({ category: 'Solitaire', action: 'variant_select', label: mode === 1 ? 'draw1' : 'draw3' });
            setDrawMode(mode);
          }}
          aria-label="Toggle draw mode"
        >
          Draw {drawMode === 1 ? '1' : '3'}
        </button>
        <button
          className="px-2 py-1 bg-gray-700 hover:bg-gray-600 rounded"
          onClick={() => setPasses((p) => (p === null ? 3 : null))}
          aria-label="Toggle redeal limit"
        >
          {passes === null ? 'Unlimited' : 'Limited'}
        </button>
        <button
          className="px-2 py-1 bg-gray-700 hover:bg-gray-600 rounded"
          onClick={() => setScoring((s) => (s === 'standard' ? 'vegas' : 'standard'))}
          aria-label="Toggle scoring"
        >
          {scoring === 'vegas' ? 'Vegas' : 'Standard'}
        </button>
        <button className="px-2 py-1 bg-gray-700 hover:bg-gray-600 rounded" onClick={undo} aria-label="Undo">
          Undo
        </button>
        <button className="px-2 py-1 bg-gray-700 hover:bg-gray-600 rounded" onClick={dailyChallenge} aria-label="Daily Challenge">
          Daily
        </button>
      </div>
      <div className="flex space-x-4 mb-4">
        <div
          className="w-16 h-24"
          onClick={draw}
          tabIndex={0}
          role="button"
          aria-label="Stock pile"
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') draw();
          }}
        >
          {game.stock.length ? renderFaceDown() : <div />}
        </div>
        <div
          className="w-16 h-24"
          onDragOver={(e) => e.preventDefault()}
          tabIndex={0}
          role="button"
          aria-label="Waste pile"
          onKeyDown={(e) => {
            if ((e.key === 'Enter' || e.key === ' ') && game.waste.length)
              handleDoubleClick('waste', 0);
          }}
        >
          {game.waste.length ? (
            <div
              draggable
              onDoubleClick={() => handleDoubleClick('waste', 0)}
              onDragStart={() =>
                handleDragStart('waste', -1, game.waste.length - 1)
              }
            >
              {renderCard(
                game.waste[game.waste.length - 1],
                hint?.source === 'waste'
              )}
            </div>
          ) : (
            <div className="w-16 h-24" />
          )}
        </div>
        {game.foundations.map((pile, i) => (
          <div
            key={`f-${i}`}
            className="w-16 h-24"
            onDragOver={(e) => e.preventDefault()}
            onDrop={() => dropToFoundation(i)}
            tabIndex={0}
            role="button"
            aria-label={`Foundation ${suits[i]}`}
          >
            {pile.length ? (
              renderCard(pile[pile.length - 1])
            ) : (
              <div className="w-16 h-24 border border-dashed border-white rounded" />
            )}
          </div>
        ))}
      </div>
      <div className="flex space-x-4">
        {game.tableau.map((pile, i) => (
          <div
            key={`t-${i}`}
            className="relative w-16 h-96 border border-black"
            onDragOver={(e) => e.preventDefault()}
            onDrop={() => dropToTableau(i)}
            tabIndex={0}
            role="button"
            aria-label={`Tableau ${i + 1}`}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ')
                handleDoubleClick('tableau', i);
            }}
          >
            {pile.map((card, idx) => (
              <div
                key={idx}
                className="absolute transition-all duration-300"
                style={{ top: idx * 24 }}
                draggable={card.faceUp}
                onDoubleClick={() => handleDoubleClick('tableau', i)}
                onDragStart={() => handleDragStart('tableau', i, idx)}
              >
                {card.faceUp
                  ? renderCard(
                      card,
                      hint &&
                        hint.source === 'tableau' &&
                        hint.index === i &&
                        idx === pile.length - 1,
                    )
                  : renderFaceDown()}
              </div>
            ))}
          </div>
        ))}
      </div>
      <div className="mt-4">
        <div className="flex flex-wrap gap-2">
          <button
            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded"
            onClick={() => start()}
          >
            Restart
          </button>
          <button
            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded"
            onClick={() => update(autoComplete)}
          >
            Auto Finish
          </button>
          <button
            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded"
            onClick={() => {
              const statsStr = localStorage.getItem('solitaireStats') || '{}';
              window.prompt('Copy stats JSON', statsStr);
            }}
          >
            Export Stats
          </button>
          <button
            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded"
            onClick={() => {
              const text = window.prompt('Paste stats JSON');
              if (text) localStorage.setItem('solitaireStats', text);
            }}
          >
            Import Stats
          </button>
        </div>
      </div>
    </div>
  );
};

export default Solitaire;
