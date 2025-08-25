import React, { useState, useEffect, useRef, useCallback } from 'react';
import ReactGA from 'react-ga4';
import {
  initializeGame,
  drawFromStock,
  moveTableauToTableau,
  moveWasteToTableau,
  moveToFoundation,
  autoMove,
  autoComplete,
  onlyStockMovesRemain,
  canPlaceOnTableau,
  suits,
  valueToString,
  GameState,
  Card,
} from './engine';

const renderCard = (card: Card) => (
  <div className="w-16 h-24 rounded border border-black bg-white flex items-center justify-center transition-transform duration-300" >
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
  const [game, setGame] = useState<GameState>(() => initializeGame(drawMode));
  const [drag, setDrag] = useState<{ source: 'tableau' | 'waste'; pile: number; index: number } | null>(null);
  const [won, setWon] = useState(false);
  const [time, setTime] = useState(0);
  const timer = useRef<NodeJS.Timeout | null>(null);
  const [hint, setHint] = useState<{ source: 'tableau' | 'waste'; pile: number; index: number } | null>(null);
  const hintTimer = useRef<NodeJS.Timeout | null>(null);
  const [wins, setWins] = useState(0);

  const start = useCallback(
    (mode: 1 | 3 = drawMode) => {
      setGame(initializeGame(mode));
      setDrawMode(mode);
      setWon(false);
      setTime(0);
      setHint(null);
    },
    [drawMode]
  );

  useEffect(() => {
    const stats = JSON.parse(
      typeof window !== 'undefined'
        ? localStorage.getItem('solitaireStats') || '{}'
        : '{}',
    );
    if (stats.wins) setWins(stats.wins);
    const saved =
      typeof window !== 'undefined'
        ? localStorage.getItem('solitaireState')
        : null;
    if (saved) {
      try {
        const { game: g, drawMode: dm, time: t } = JSON.parse(saved);
        setGame(g);
        setDrawMode(dm);
        setTime(t);
        if (g.foundations.every((p: Card[]) => p.length === 13)) setWon(true);
      } catch {
        start(drawMode);
      }
    } else {
      start(drawMode);
    }
  }, []);

  useEffect(() => {
    if (won) return;
    timer.current = setInterval(() => {
      setTime((t) => {
        const nt = t + 1;
        if (nt % 10 === 0) {
          setGame((g) => ({ ...g, score: g.score - 2 }));
        }
        return nt;
      });
    }, 1000);
    return () => {
      if (timer.current) clearInterval(timer.current);
    };
  }, [won]);

  useEffect(() => {
    localStorage.setItem('solitaireState', JSON.stringify({ game, drawMode, time }));
  }, [game, drawMode, time]);

  useEffect(() => {
    if (!won && onlyStockMovesRemain(game)) {
      setGame((g) => autoComplete(g));
    }
  }, [game, won]);

  useEffect(() => {
    if (game.foundations.every((p) => p.length === 13)) {
      setWon(true);
      ReactGA.event({ category: 'Solitaire', action: 'win' });
    }
  }, [game]);

  useEffect(() => {
    if (!won) return;
    if (timer.current) clearInterval(timer.current);
    const best = JSON.parse(localStorage.getItem('solitaireBest') || '{}');
    if (!best.score || game.score > best.score) {
      localStorage.setItem(
        'solitaireBest',
        JSON.stringify({ score: game.score, time }),
      );
    }
    const stats = JSON.parse(localStorage.getItem('solitaireStats') || '{}');
    const newStats = { wins: (stats.wins || 0) + 1 };
    localStorage.setItem('solitaireStats', JSON.stringify(newStats));
    setWins(newStats.wins);
  }, [won, game, time]);

  const draw = () => {
    setHint(null);
    setGame((g) => {
      const n = drawFromStock(g);
      if (n !== g) ReactGA.event({ category: 'Solitaire', action: 'move', label: 'manual' });
      return n;
    });
  };

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
    setHint(null);
    if (drag.source === 'tableau') {
      setGame((g) => {
        const n = moveTableauToTableau(g, drag.pile, drag.index, pileIndex);
        if (n !== g) ReactGA.event({ category: 'Solitaire', action: 'move', label: 'manual' });
        return n;
      });
    } else {
      setGame((g) => {
        const n = moveWasteToTableau(g, pileIndex);
        if (n !== g) ReactGA.event({ category: 'Solitaire', action: 'move', label: 'manual' });
        return n;
      });
    }
    finishDrag();
  };

  const dropToFoundation = (pileIndex: number) => {
    if (!drag) return;
    setHint(null);
    if (drag.source === 'tableau') {
      setGame((g) => {
        const n = moveToFoundation(g, 'tableau', drag.pile);
        if (n !== g) ReactGA.event({ category: 'Solitaire', action: 'move', label: 'manual' });
        return n;
      });
    } else {
      setGame((g) => {
        const n = moveToFoundation(g, 'waste', null);
        if (n !== g) ReactGA.event({ category: 'Solitaire', action: 'move', label: 'manual' });
        return n;
      });
    }
    finishDrag();
  };

  const handleDoubleClick = (source: 'tableau' | 'waste', pile: number) => {
    setHint(null);
    setGame((g) => {
      const n = autoMove(g, source, source === 'tableau' ? pile : null);
      if (n !== g) ReactGA.event({ category: 'Solitaire', action: 'move', label: 'auto' });
      return n;
    });
  };

  const showHint = () => {
    const find = (state: GameState) => {
      if (state.waste.length) {
        const card = state.waste[state.waste.length - 1];
        const dest = state.foundations[suits.indexOf(card.suit)];
        if (
          (dest.length === 0 && card.value === 1) ||
          (dest.length && dest[dest.length - 1].value + 1 === card.value) ||
          state.tableau.some((p) => canPlaceOnTableau(card, p))
        ) {
          return { source: 'waste', pile: -1, index: state.waste.length - 1 };
        }
      }
      for (let i = 0; i < state.tableau.length; i += 1) {
        const pile = state.tableau[i];
        if (!pile.length) continue;
        const top = pile[pile.length - 1];
        if (top.faceUp) {
          const dest = state.foundations[suits.indexOf(top.suit)];
          if (
            (dest.length === 0 && top.value === 1) ||
            (dest.length && dest[dest.length - 1].value + 1 === top.value)
          ) {
            return { source: 'tableau', pile: i, index: pile.length - 1 };
          }
        }
        for (let j = 0; j < pile.length; j += 1) {
          const card = pile[j];
          if (!card.faceUp) continue;
          for (let k = 0; k < state.tableau.length; k += 1) {
            if (k !== i && canPlaceOnTableau(card, state.tableau[k])) {
              return { source: 'tableau', pile: i, index: j };
            }
          }
        }
      }
      return null;
    };
    const h = find(game);
    setHint(h);
    if (hintTimer.current) clearTimeout(hintTimer.current);
    hintTimer.current = setTimeout(() => setHint(null), 3000);
    ReactGA.event({ category: 'Solitaire', action: 'hint' });
  };

  const best = JSON.parse(
    typeof window !== 'undefined' ? localStorage.getItem('solitaireBest') || '{}' : '{}',
  );

  return (
    <div className="h-full w-full bg-green-700 text-white select-none p-2">
      {won && (
        <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 text-2xl">
          You win!
        </div>
      )}
      <div className="flex justify-between mb-2">
        <div>Score: {game.score}</div>
        <div>Time: {time}s</div>
        <div>Redeals: {game.redeals}</div>
        <div>Wins: {wins}</div>
        <div>Best: {best.score ? `${best.score} (${best.time}s)` : 'N/A'}</div>
        <button
          className="px-2 py-1 bg-gray-700 hover:bg-gray-600 rounded"
          onClick={() => {
            const mode = drawMode === 1 ? 3 : 1;
            ReactGA.event({ category: 'Solitaire', action: 'variant_select', label: mode === 1 ? 'draw1' : 'draw3' });
            start(mode);
          }}
        >
          Draw {drawMode === 1 ? '1' : '3'}
        </button>
      </div>
      <div className="flex space-x-4 mb-4">
        <div className="w-16 h-24" onClick={draw}>
          {game.stock.length ? renderFaceDown() : <div />}
        </div>
        <div className="w-16 h-24" onDragOver={(e) => e.preventDefault()}>
          {game.waste.length ? (
            <div
              draggable
              onDoubleClick={() => handleDoubleClick('waste', 0)}
              onDragStart={() => handleDragStart('waste', -1, game.waste.length - 1)}
              className={
                hint && hint.source === 'waste' ? 'ring-4 ring-yellow-400' : ''
              }
            >
              {renderCard(game.waste[game.waste.length - 1])}
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
          >
            {pile.length ? renderCard(pile[pile.length - 1]) : (
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
          >
            {pile.map((card, idx) => {
              const isHint =
                hint && hint.source === 'tableau' && hint.pile === i && hint.index === idx;
              return (
                <div
                  key={idx}
                  className={`absolute transition-all duration-300 ${
                    isHint ? 'ring-4 ring-yellow-400' : ''
                  }`}
                  style={{ top: idx * 24 }}
                  draggable={card.faceUp}
                  onDoubleClick={() => handleDoubleClick('tableau', i)}
                  onDragStart={() => handleDragStart('tableau', i, idx)}
                >
                  {card.faceUp ? renderCard(card) : renderFaceDown()}
                </div>
              );
            })}
          </div>
        ))}
      </div>
      <div className="mt-4 space-x-2">
        <button
          className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded"
          onClick={() => start()}
        >
          Restart
        </button>
        <button
          className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded"
          onClick={showHint}
        >
          Hint
        </button>
      </div>
    </div>
  );
};

export default Solitaire;
