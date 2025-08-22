import React, { useState, useEffect, useRef, useCallback } from 'react';
import ReactGA from 'react-ga4';
import {
  initializeGame,
  drawFromStock,
  moveTableauToTableau,
  moveWasteToTableau,
  moveToFoundation,
  autoMove,
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

    const start = useCallback(
      (mode: 1 | 3 = drawMode) => {
        setGame(initializeGame(mode));
        setWon(false);
        setTime(0);
      },
      [drawMode]
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
  }, [game]);

  const draw = () =>
    setGame((g) => {
      const n = drawFromStock(g);
      if (n !== g) ReactGA.event({ category: 'Solitaire', action: 'move', label: 'manual' });
      return n;
    });

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
    setGame((g) => {
      const n = autoMove(g, source, source === 'tableau' ? pile : null);
      if (n !== g) ReactGA.event({ category: 'Solitaire', action: 'move', label: 'auto' });
      return n;
    });
  };

  const best = JSON.parse(typeof window !== 'undefined' ? localStorage.getItem('solitaireBest') || '{}' : '{}');

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
        <div>Best: {best.score ? `${best.score} (${best.time}s)` : 'N/A'}</div>
        <button
          className="px-2 py-1 bg-gray-700 hover:bg-gray-600 rounded"
          onClick={() => {
            const mode = drawMode === 1 ? 3 : 1;
            ReactGA.event({ category: 'Solitaire', action: 'variant_select', label: mode === 1 ? 'draw1' : 'draw3' });
            setDrawMode(mode);
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
            {pile.map((card, idx) => (
              <div
                key={idx}
                className="absolute transition-all duration-300"
                style={{ top: idx * 24 }}
                draggable={card.faceUp}
                onDoubleClick={() => handleDoubleClick('tableau', i)}
                onDragStart={() => handleDragStart('tableau', i, idx)}
              >
                {card.faceUp ? renderCard(card) : renderFaceDown()}
              </div>
            ))}
          </div>
        ))}
      </div>
      <div className="mt-4">
        <button
          className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded"
          onClick={() => start()}
        >
          Restart
        </button>
      </div>
    </div>
  );
};

export default Solitaire;
