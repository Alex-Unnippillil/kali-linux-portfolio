import React, { useState, useEffect, useRef, useCallback } from 'react';
import ReactGA from 'react-ga4';
import usePrefersReducedMotion from '../../hooks/usePrefersReducedMotion';
import {
  initializeGame,
  drawFromStock,
  moveTableauToTableau,
  moveWasteToTableau,
  moveToFoundation,
  autoMove,
  autoComplete,
  valueToString,
  GameState,
  Card,
} from './engine';

type Variant = 'klondike' | 'spider' | 'freecell';
type Stats = {
  gamesPlayed: number;
  gamesWon: number;
  bestScore: number;
  bestTime: number;
  dailyStreak: number;
  lastDaily: string | null;
};

type AnimatedCard = Card & {
  x: number;
  y: number;
  vx: number;
  vy: number;
};

const renderCard = (card: Card) => (
  <div className="w-16 h-24 rounded border border-black bg-white flex items-center justify-center transition-transform duration-300">
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
  const [variant, setVariant] = useState<Variant>('klondike');
  const [game, setGame] = useState<GameState>(() => initializeGame(drawMode));
  const [drag, setDrag] = useState<{ source: 'tableau' | 'waste'; pile: number; index: number } | null>(null);
  const [won, setWon] = useState(false);
  const [time, setTime] = useState(0);
  const [isDaily, setIsDaily] = useState(false);
  const [stats, setStats] = useState<Stats>({
    gamesPlayed: 0,
    gamesWon: 0,
    bestScore: 0,
    bestTime: 0,
    dailyStreak: 0,
    lastDaily: null,
  });
  const prefersReducedMotion = usePrefersReducedMotion();
  const [cascade, setCascade] = useState<AnimatedCard[]>([]);
  const cascadeRef = useRef<number>();
  const [ariaMessage, setAriaMessage] = useState('');
  const timer = useRef<NodeJS.Timeout | null>(null);
  const foundationRefs = useRef<(HTMLDivElement | null)[]>([]);
  const tableauRefs = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const saved = JSON.parse(
      localStorage.getItem(`solitaireStats-${variant}`) || '{}',
    );
    setStats({
      gamesPlayed: 0,
      gamesWon: 0,
      bestScore: 0,
      bestTime: 0,
      dailyStreak: 0,
      lastDaily: null,
      ...saved,
    });
  }, [variant]);

  const start = useCallback(
    (mode: 1 | 3 = drawMode, v: Variant = variant, daily = false) => {
      const seed = daily
        ? Number(new Date().toISOString().slice(0, 10).replace(/-/g, ''))
        : undefined;
      setGame(initializeGame(mode, undefined, seed));
      setWon(false);
      setTime(0);
      setIsDaily(daily);
      setStats((s) => {
        const ns = { ...s, gamesPlayed: s.gamesPlayed + 1 };
        if (typeof window !== 'undefined') {
          localStorage.setItem(`solitaireStats-${v}`, JSON.stringify(ns));
        }
        return ns;
      });
    },
    [drawMode, variant],
  );

  useEffect(() => {
    if (variant === 'klondike') start(drawMode, variant);
  }, [drawMode, variant, start]);

  useEffect(() => {
    if (won) {
      if (timer.current) clearInterval(timer.current);
      setStats((s) => {
        const bestScore = game.score > s.bestScore ? game.score : s.bestScore;
        const bestTime = s.bestTime === 0 || time < s.bestTime ? time : s.bestTime;
        let { dailyStreak, lastDaily } = s;
        if (isDaily) {
          const today = new Date().toISOString().slice(0, 10);
          const yesterday = new Date(Date.now() - 86400000)
            .toISOString()
            .slice(0, 10);
          if (lastDaily === today) {
            // already counted
          } else if (lastDaily === yesterday) {
            dailyStreak += 1;
          } else {
            dailyStreak = 1;
          }
          lastDaily = today;
        }
        const ns = {
          ...s,
          gamesWon: s.gamesWon + 1,
          bestScore,
          bestTime,
          dailyStreak,
          lastDaily,
        };
        if (typeof window !== 'undefined') {
          localStorage.setItem(`solitaireStats-${variant}`, JSON.stringify(ns));
        }
        return ns;
      });
      return;
    }
    timer.current = setInterval(() => setTime((t) => t + 1), 1000);
    return () => {
      if (timer.current) clearInterval(timer.current);
    };
  }, [won, game, time, isDaily, variant, setStats]);

  useEffect(() => {
    if (game.foundations.every((p) => p.length === 13)) {
      setWon(true);
      ReactGA.event({ category: 'Solitaire', action: 'win' });
    }
  }, [game]);

  useEffect(() => {
    if (won && !prefersReducedMotion) {
      const cards: AnimatedCard[] = [];
      const w = window.innerWidth;
      const h = window.innerHeight;
      game.foundations.forEach((pile) => {
        pile.forEach((card) => {
          cards.push({
            ...card,
            x: Math.random() * w,
            y: -Math.random() * h,
            vx: (Math.random() - 0.5) * 4,
            vy: Math.random() * 2 + 2,
          });
        });
      });
      setCascade(cards);
    }
  }, [won, prefersReducedMotion, game.foundations]);

  useEffect(() => {
    if (!cascade.length || prefersReducedMotion) return;
    const animate = () => {
      setCascade((cards) =>
        cards
          .map((c) => ({
            ...c,
            x: c.x + c.vx,
            y: c.y + c.vy,
            vy: c.vy + 0.3,
          }))
          .filter((c) => c.y < window.innerHeight + 100),
      );
      cascadeRef.current = requestAnimationFrame(animate);
    };
    cascadeRef.current = requestAnimationFrame(animate);
    return () => {
      if (cascadeRef.current) cancelAnimationFrame(cascadeRef.current);
    };
  }, [cascade.length, prefersReducedMotion]);

  useEffect(() => {
    setAriaMessage(`Score ${game.score}, time ${time} seconds, redeals ${game.redeals}`);
  }, [game.score, time, game.redeals]);

  useEffect(() => {
    if (won) setAriaMessage('You win!');
  }, [won]);

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

  const isInside = (rect: DOMRect, x: number, y: number) =>
    x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom;

  const handleDragEnd = (e: React.DragEvent<HTMLDivElement>) => {
    if (!drag) return;
    const { clientX, clientY } = e;

    const foundationIndex = foundationRefs.current.findIndex(
      (ref) => ref && isInside(ref.getBoundingClientRect(), clientX, clientY),
    );
    if (foundationIndex !== -1) {
      dropToFoundation(foundationIndex);
      return;
    }

    const tableauIndex = tableauRefs.current.findIndex(
      (ref) => ref && isInside(ref.getBoundingClientRect(), clientX, clientY),
    );
    if (tableauIndex !== -1) {
      dropToTableau(tableauIndex);
      return;
    }
    finishDrag();
  };

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

  useEffect(() => {
    if (
      game.stock.length === 0 &&
      game.tableau.every((p) => p.every((c) => c.faceUp))
    ) {
      setGame((g) => {
        const n = autoComplete(g);
        if (n !== g)
          ReactGA.event({ category: 'Solitaire', action: 'move', label: 'auto' });
        return n;
      });
    }
  }, [game]);
  if (variant !== 'klondike') {
    return (
      <div className="h-full w-full bg-green-700 text-white select-none p-2">
        <div className="flex justify-end mb-2">
          <select
            className="px-2 py-1 bg-gray-700 hover:bg-gray-600 rounded"
            value={variant}
            onChange={(e) => {
              const v = e.target.value as Variant;
              setVariant(v);
            }}
          >
            <option value="klondike">Klondike</option>
            <option value="spider">Spider</option>
            <option value="freecell">FreeCell</option>
          </select>
        </div>
        <div className="flex items-center justify-center h-full text-xl">
          {`${variant.charAt(0).toUpperCase() + variant.slice(1)} coming soon!`}
        </div>
      </div>
    );
  }

  return (
    <div className="h-full w-full bg-green-700 text-white select-none p-2 relative overflow-hidden">
      <div aria-live="polite" className="sr-only">
        {ariaMessage}
      </div>
      {won && !prefersReducedMotion &&
        cascade.map((c, i) => (
          <div key={i} className="absolute" style={{ left: c.x, top: c.y }}>
            {renderCard(c)}
          </div>
        ))}
      {won && (
        <div
          className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-80 text-2xl"
          role="alert"
        >
          You win!
        </div>
      )}
      <div className="flex justify-between mb-2 flex-wrap gap-2">
        <div>Score: {game.score}</div>
        <div>Time: {time}s</div>
        <div>Redeals: {game.redeals}</div>
        <div>
          Best: {stats.bestScore ? `${stats.bestScore} (${stats.bestTime}s)` : 'N/A'}
        </div>
        <div>
          Wins: {stats.gamesWon}/{stats.gamesPlayed}
        </div>
        <div>Daily Streak: {stats.dailyStreak}</div>
        <select
          className="px-2 py-1 bg-gray-700 hover:bg-gray-600 rounded"
          value={variant}
          onChange={(e) => {
            const v = e.target.value as Variant;
            ReactGA.event({ category: 'Solitaire', action: 'variant_select', label: v });
            setVariant(v);
          }}
        >
          <option value="klondike">Klondike</option>
          <option value="spider">Spider</option>
          <option value="freecell">FreeCell</option>
        </select>
        <button
          className="px-2 py-1 bg-gray-700 hover:bg-gray-600 rounded"
          onClick={() => start(drawMode, variant, true)}
        >
          Daily Deal
        </button>
        <button
          className="px-2 py-1 bg-gray-700 hover:bg-gray-600 rounded"
          onClick={() => {
            const mode = drawMode === 1 ? 3 : 1;
            ReactGA.event({
              category: 'Solitaire',
              action: 'variant_select',
              label: mode === 1 ? 'draw1' : 'draw3',
            });
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
              onDragEnd={handleDragEnd}
              className={`${
                drag && drag.source === 'waste'
                  ? 'transform -translate-y-2 shadow-lg z-50'
                  : ''
              } ${!prefersReducedMotion ? 'transition-transform' : ''}`}
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
            ref={(el) => {
              foundationRefs.current[i] = el;
            }}
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
              ref={(el) => {
                tableauRefs.current[i] = el;
              }}
          >
            {pile.map((card, idx) => (
              <div
                key={idx}
                className={`absolute ${
                  !prefersReducedMotion ? 'transition-transform duration-300' : ''
                } ${
                  drag &&
                  drag.source === 'tableau' &&
                  drag.pile === i &&
                  idx >= drag.index
                    ? 'transform -translate-y-2 shadow-lg z-50'
                    : ''
                }`}
                style={{ top: idx * 24 }}
                draggable={card.faceUp}
                onDoubleClick={() => handleDoubleClick('tableau', i)}
                onDragStart={() => handleDragStart('tableau', i, idx)}
                onDragEnd={handleDragEnd}
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
          onClick={() => start(drawMode, variant, isDaily)}
        >
          Restart
        </button>
      </div>
    </div>
  );
};

export default Solitaire;
