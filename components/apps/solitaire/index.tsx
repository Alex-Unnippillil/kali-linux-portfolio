import React, { useState, useEffect, useRef, useCallback } from 'react';
import ReactGA from 'react-ga4';
import usePrefersReducedMotion from '../../../hooks/usePrefersReducedMotion';
import {
  initializeGame,
  drawFromStock,
  moveTableauToTableau,
  moveWasteToTableau,
  moveToFoundation,
  autoComplete,
  valueToString,
  GameState,
  Card,
  createDeck,
  findHint,
  suits,
} from './engine';
import { solve } from './solver';

type Variant = 'klondike' | 'spider' | 'freecell';
type Stats = {
  gamesPlayed: number;
  gamesWon: number;
  bestScore: number;
  bestTime: number;
  dailyStreak: number;
  lastDaily: string | null;
};

const getStatsKey = (v: Variant, mode: 1 | 3, passes: number) =>
  `solitaireStats-${v}-d${mode}-p${passes === Infinity ? 'u' : passes}`;

type AnimatedCard = Card & {
  x: number;
  y: number;
  angle: number;
  tx?: number;
  ty?: number;
  finalAngle?: number;
};

const renderCard = (card: Card) => (
  <div className="w-16 h-24 min-w-[24px] min-h-[24px] rounded border border-black bg-white flex items-center justify-center transition-transform duration-300 shadow-[0_1px_0_rgba(0,0,0,0.5)]">
    <span className={card.color === 'red' ? 'text-red-600' : ''}>
      {valueToString(card.value)}{card.suit}
    </span>
  </div>
);

const renderFaceDown = () => (
  <div className="w-16 h-24 min-w-[24px] min-h-[24px] rounded border border-black bg-blue-800 shadow-[0_1px_0_rgba(0,0,0,0.5)]" />
);

const Solitaire = () => {
  const [drawMode, setDrawMode] = useState<1 | 3>(1);
  const [passLimit, setPassLimit] = useState<number>(3);
  const [variant, setVariant] = useState<Variant>('klondike');
  const [game, setGame] = useState<GameState>(() =>
    initializeGame(drawMode, undefined, undefined, passLimit),
  );
  const [drag, setDrag] = useState<{ source: 'tableau' | 'waste'; pile: number; index: number } | null>(null);
  const [won, setWon] = useState(false);
  const [time, setTime] = useState(0);
  const [moves, setMoves] = useState(0);
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
  const [ariaMessage, setAriaMessage] = useState('');
  const timer = useRef<NodeJS.Timeout | null>(null);
  const [paused, setPaused] = useState(prefersReducedMotion);
  const [scale, setScale] = useState(1);
  const foundationRefs = useRef<(HTMLDivElement | null)[]>([]);
  const tableauRefs = useRef<(HTMLDivElement | null)[]>([]);
  const wasteRef = useRef<HTMLDivElement | null>(null);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const dragImageRef = useRef<HTMLDivElement | null>(null);
  const dragCardRef = useRef<HTMLDivElement | null>(null);
  const [flying, setFlying] = useState<AnimatedCard[]>([]);
  const [autoCompleting, setAutoCompleting] = useState(false);
  const [winnableOnly, setWinnableOnly] = useState(false);
  const [hint, setHint] = useState<{ source: 'tableau' | 'waste'; pile: number; index: number } | null>(null);
  const [bankroll, setBankroll] = useState(0);
  const [bankrollReady, setBankrollReady] = useState(false);
  const foundationCountRef = useRef(0);

  useEffect(() => {
    if (typeof window === 'undefined') {
      setBankrollReady(true);
      return;
    }
    const savedBankroll = Number(localStorage.getItem('solitaireBankroll') || '0');
    setBankroll(savedBankroll);
    setBankrollReady(true);
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const saved = JSON.parse(
      localStorage.getItem(getStatsKey(variant, drawMode, passLimit)) || '{}',
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
  }, [variant, drawMode, passLimit]);

  useEffect(() => {
    const updateScale = () => {
      const root = rootRef.current;
      if (!root) return;
      const width = root.scrollWidth;
      const s = Math.min(1, window.innerWidth / width);
      const minScale = 24 / 64;
      setScale(Math.max(s, minScale));
    };
    updateScale();
    window.addEventListener('resize', updateScale);
    return () => window.removeEventListener('resize', updateScale);
  }, []);

  useEffect(() => {
    const handleVis = () => {
      if (document.visibilityState === 'hidden') setPaused(true);
    };
    document.addEventListener('visibilitychange', handleVis);
    return () => document.removeEventListener('visibilitychange', handleVis);
  }, []);

  useEffect(() => {
    if (prefersReducedMotion) setPaused(true);
  }, [prefersReducedMotion]);

  const resume = useCallback(() => setPaused(false), []);

  const start = useCallback(
    (
      mode: 1 | 3 = drawMode,
      v: Variant = variant,
      daily = false,
      winnable = winnableOnly,
    ) => {
      const seed = daily
        ? Number(new Date().toISOString().slice(0, 10).replace(/-/g, ''))
        : undefined;
      let deck: Card[] | undefined;
      if (winnable && !daily) {
        for (let attempt = 0; attempt < 1000; attempt += 1) {
          const d = createDeck();
          const test = initializeGame(mode, d.slice(), undefined, passLimit);
          if (findHint(test)) {
            deck = d;
            break;
          }
        }
      }
      setGame(initializeGame(mode, deck, seed, passLimit));
      setWon(false);
      setCascade([]);
      setTime(0);
      setMoves(0);
      setIsDaily(daily);
      setBankroll((b) => {
        const nb = b - 52;
        if (typeof window !== 'undefined') {
          localStorage.setItem('solitaireBankroll', String(nb));
        }
        return nb;
      });
      foundationCountRef.current = 0;
      setStats((s) => {
        const ns = { ...s, gamesPlayed: s.gamesPlayed + 1 };
        if (typeof window !== 'undefined') {
          localStorage.setItem(
            getStatsKey(v, mode, passLimit),
            JSON.stringify(ns),
          );
        }
        return ns;
      });
    },
    [drawMode, variant, winnableOnly, passLimit],
  );

  useEffect(() => {
    if (bankrollReady && variant === 'klondike') start(drawMode, variant);
  }, [drawMode, variant, start, bankrollReady]);

  const vegasScore =
    game.foundations.reduce((sum, p) => sum + p.length, 0) * 5 - 52;

  useEffect(() => {
    if (won) {
      if (timer.current) clearInterval(timer.current);
      setStats((s) => {
        const bestScore = vegasScore > s.bestScore ? vegasScore : s.bestScore;
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
          localStorage.setItem(
            getStatsKey(variant, drawMode, passLimit),
            JSON.stringify(ns),
          );
        }
        return ns;
      });
      return;
    }
    if (paused) {
      if (timer.current) clearInterval(timer.current);
      return;
    }
    timer.current = setInterval(() => setTime((t) => t + 1), 1000);
    return () => {
      if (timer.current) clearInterval(timer.current);
    };
  }, [won, paused, game, time, isDaily, variant, drawMode, passLimit, setStats, vegasScore]);

  useEffect(() => {
    if (game.foundations.every((p) => p.length === 13)) {
      setWon(true);
      ReactGA.event({ category: 'Solitaire', action: 'win' });
    }
  }, [game]);

  useEffect(() => {
    const count = game.foundations.reduce((sum, p) => sum + p.length, 0);
    if (count > foundationCountRef.current) {
      const diff = count - foundationCountRef.current;
      setBankroll((b) => {
        const nb = b + diff * 5;
        if (typeof window !== 'undefined') {
          localStorage.setItem('solitaireBankroll', String(nb));
        }
        return nb;
      });
    }
    foundationCountRef.current = count;
  }, [game.foundations]);

  useEffect(() => {
    if (won && !prefersReducedMotion) {
      const foundationCards = game.foundations.flat();
      const cx = (window.innerWidth / 2) / scale;
      const cy = (window.innerHeight / 2) / scale;
      const radius = Math.min(cx, cy) * 0.8;
      const cards: AnimatedCard[] = foundationCards.map((card, i) => {
        const angle = (i / foundationCards.length) * Math.PI * 2;
        return {
          ...card,
          x: cx,
          y: cy,
          angle: 0,
          tx: cx + radius * Math.cos(angle),
          ty: cy + radius * Math.sin(angle),
          finalAngle: (angle * 180) / Math.PI,
        };
      });
      setCascade(cards);
      requestAnimationFrame(() => {
        setCascade((c) =>
          c.map((card) => ({
            ...card,
            x: card.tx!,
            y: card.ty!,
            angle: card.finalAngle!,
          })),
        );
      });
    }
  }, [won, prefersReducedMotion, game.foundations, scale]);

  useEffect(() => {
    if (hint) {
      const id = setTimeout(() => setHint(null), 2000);
      return () => clearTimeout(id);
    }
  }, [hint]);

  useEffect(() => {
    setAriaMessage(
      `Score ${vegasScore}, time ${time} seconds, redeals ${
        game.redeals === Infinity ? 'infinite' : game.redeals
      }`,
    );
  }, [vegasScore, time, game.redeals]);

  useEffect(() => {
    if (won) setAriaMessage('You win!');
  }, [won]);

  const draw = () =>
    setGame((g) => {
      const n = drawFromStock(g);
      if (n !== g) {
        ReactGA.event({ category: 'Solitaire', action: 'move', label: 'manual' });
        setMoves((m) => m + 1);
      }
      return n;
    });

  const showHint = () => {
    const h = findHint(game);
    if (h) setHint(h);
  };


  const handleDragStart = (
    source: 'tableau' | 'waste',
    pile: number,
    index: number,
    e: React.DragEvent<HTMLDivElement>,
  ) => {
    if (source === 'tableau') {
      const card = game.tableau[pile][index];
      if (!card.faceUp) return;
      setDrag({ source, pile, index });
    } else if (source === 'waste' && game.waste.length) {
      setDrag({ source, pile: -1, index: game.waste.length - 1 });
    }
    const ghost = e.currentTarget.cloneNode(true) as HTMLDivElement;
    ghost.style.position = 'absolute';
    ghost.style.top = '-1000px';
    ghost.style.left = '-1000px';
    ghost.style.pointerEvents = 'none';
    ghost.style.boxShadow = '0 8px 16px rgba(0,0,0,0.3)';
    document.body.appendChild(ghost);
    e.dataTransfer.setDragImage(ghost, 32, 48);
    dragImageRef.current = ghost;
    dragCardRef.current = e.currentTarget as HTMLDivElement;
    dragCardRef.current.style.opacity = '0';
  };

  const finishDrag = () => setDrag(null);

  const isInside = (rect: DOMRect, x: number, y: number) =>
    x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom;

  const handleDragEnd = (e: React.DragEvent<HTMLDivElement>) => {
    if (dragImageRef.current) {
      document.body.removeChild(dragImageRef.current);
      dragImageRef.current = null;
    }
    if (dragCardRef.current) {
      dragCardRef.current.style.opacity = '';
      dragCardRef.current = null;
    }
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

  const flyMove = useCallback(
    (
      fromState: GameState,
      toState: GameState,
      source: 'waste' | 'tableau',
      pile: number | null,
      cb: () => void = () => {},
    ) => {
      const root = rootRef.current;
      if (!root) {
        setGame(toState);
        cb();
        return;
      }
      const rootRect = root.getBoundingClientRect();
      const scaleFactor = scale;
      let fromX = 0;
      let fromY = 0;
      let card: Card;
      if (source === 'waste') {
        card = fromState.waste[fromState.waste.length - 1];
        const rect = wasteRef.current?.getBoundingClientRect();
        if (rect) {
          fromX = (rect.left - rootRect.left) / scaleFactor;
          fromY = (rect.top - rootRect.top) / scaleFactor;
        }
      } else {
        card = fromState.tableau[pile!][fromState.tableau[pile!].length - 1];
        const rect = tableauRefs.current[pile!]?.getBoundingClientRect();
        if (rect) {
          fromX = (rect.left - rootRect.left) / scaleFactor;
          fromY =
            (rect.top - rootRect.top) / scaleFactor +
            (fromState.tableau[pile!].length - 1) * 24;
        }
      }
      const destIndex = suits.indexOf(card.suit);
      const destRect = foundationRefs.current[destIndex]?.getBoundingClientRect();
      const toX = destRect
        ? (destRect.left - rootRect.left) / scaleFactor
        : fromX;
      const toY = destRect
        ? (destRect.top - rootRect.top) / scaleFactor
        : fromY;
      const tempFoundations = toState.foundations.map((p, i) =>
        i === destIndex ? p.slice(0, -1) : p,
      );
      const tempState = {
        ...toState,
        foundations: tempFoundations,
        score: toState.score - 10,
      };
      setGame(tempState);
      const anim: AnimatedCard = {
        ...card,
        x: fromX,
        y: fromY,
        angle: 0,
        tx: toX,
        ty: toY,
      };
      setFlying((f) => [...f, anim]);
      requestAnimationFrame(() => {
        setFlying((f) =>
          f.map((c) => (c === anim ? { ...c, x: toX, y: toY } : c)),
        );
      });
      setTimeout(() => {
        setFlying((f) => f.filter((c) => c !== anim));
        setGame(toState);
        cb();
      }, 300);
    },
    [foundationRefs, tableauRefs, wasteRef, rootRef, scale],
  );

  const runSolver = useCallback(() => {
    const moves = solve(game);
    const play = (index: number, g: GameState) => {
      if (index >= moves.length) return;
      const m = moves[index];
      let next = g;
      if (m.type === 'draw') {
        next = drawFromStock(g);
        setGame(next);
        setTimeout(() => play(index + 1, next), 300);
        return;
      }
      if (m.type === 'wasteToTableau') {
        next = moveWasteToTableau(g, m.to);
        setGame(next);
        setTimeout(() => play(index + 1, next), 300);
        return;
      }
      if (m.type === 'tableauToTableau') {
        next = moveTableauToTableau(g, m.from, m.index, m.to);
        setGame(next);
        setTimeout(() => play(index + 1, next), 300);
        return;
      }
      if (m.type === 'wasteToFoundation') {
        next = moveToFoundation(g, 'waste', null);
        flyMove(g, next, 'waste', null, () => play(index + 1, next));
        return;
      }
      if (m.type === 'tableauToFoundation') {
        next = moveToFoundation(g, 'tableau', m.from);
        flyMove(g, next, 'tableau', m.from, () => play(index + 1, next));
      }
    };
    play(0, game);
  }, [game, flyMove]);

  const dropToTableau = (pileIndex: number) => {
    if (!drag) return;
    if (drag.source === 'tableau') {
      setGame((g) => {
        const n = moveTableauToTableau(g, drag.pile, drag.index, pileIndex);
        if (n !== g) {
          ReactGA.event({ category: 'Solitaire', action: 'move', label: 'manual' });
          setMoves((m) => m + 1);
        }
        return n;
      });
    } else {
      setGame((g) => {
        const n = moveWasteToTableau(g, pileIndex);
        if (n !== g) {
          ReactGA.event({ category: 'Solitaire', action: 'move', label: 'manual' });
          setMoves((m) => m + 1);
        }
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
        if (n !== g) {
          ReactGA.event({ category: 'Solitaire', action: 'move', label: 'manual' });
          setMoves((m) => m + 1);
        }
        return n;
      });
    } else {
      setGame((g) => {
        const n = moveToFoundation(g, 'waste', null);
        if (n !== g) {
          ReactGA.event({ category: 'Solitaire', action: 'move', label: 'manual' });
          setMoves((m) => m + 1);
        }
        return n;
      });
    }
    finishDrag();
  };

  const handleDoubleClick = (source: 'tableau' | 'waste', pile: number) => {
    const current = game;
    const next = moveToFoundation(
      current,
      source,
      source === 'tableau' ? pile : null,
    );
    if (next !== current) {
      ReactGA.event({ category: 'Solitaire', action: 'move', label: 'auto' });
      setMoves((m) => m + 1);
      flyMove(
        current,
        next,
        source,
        source === 'tableau' ? pile : null,
      );
    }
  };

  const autoCompleteNext = useCallback(
    (g: GameState) => {
      let next = moveToFoundation(g, 'waste', null);
      if (next !== g) {
        ReactGA.event({ category: 'Solitaire', action: 'move', label: 'auto' });
        setMoves((m) => m + 1);
        flyMove(g, next, 'waste', null, () => autoCompleteNext(next));
        return;
      }
      for (let i = 0; i < g.tableau.length; i += 1) {
        next = moveToFoundation(g, 'tableau', i);
        if (next !== g) {
          ReactGA.event({ category: 'Solitaire', action: 'move', label: 'auto' });
          setMoves((m) => m + 1);
          flyMove(g, next, 'tableau', i, () => autoCompleteNext(next));
          return;
        }
      }
      setAutoCompleting(false);
    },
    [flyMove],
  );

  useEffect(() => {
    if (
      !autoCompleting &&
      game.stock.length === 0 &&
      game.tableau.every((p) => p.every((c) => c.faceUp))
    ) {
      if (prefersReducedMotion) {
        // When animations are disabled we can instantly finish the game using
        // the engine's autoComplete helper.
        setGame((g) => autoComplete(g));
        return;
      }
      setAutoCompleting(true);
      autoCompleteNext(game);
    }
  }, [
    game,
    autoCompleteNext,
    autoCompleting,
    prefersReducedMotion,
    setGame,
  ]);
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
    <div
      ref={rootRef}
      className="h-full w-full bg-green-700 text-white select-none p-2 pt-8 relative overflow-hidden"
      style={{ transform: `scale(${scale})`, transformOrigin: 'top left' }}
    >
      <div className="absolute top-0 left-0 right-0 flex justify-between px-2 text-sm pointer-events-none">
        <span>Moves: {moves}</span>
        <span>Time: {time}s</span>
      </div>
      <div aria-live="polite" className="sr-only">
        {ariaMessage}
      </div>
      {paused && (
        <div
          className="absolute inset-0 bg-black bg-opacity-75 z-50 flex items-center justify-center"
          role="dialog"
          aria-modal="true"
        >
          <button
            type="button"
            onClick={resume}
            className="px-4 py-2 bg-gray-700 text-white rounded focus:outline-none focus:ring"
            autoFocus
          >
            Resume
          </button>
        </div>
      )}
      {flying.map((c, i) => (
        <div
          key={`fly-${i}`}
          className="absolute transition-transform duration-300"
          style={{ transform: `translate(${c.x}px, ${c.y}px)` }}
        >
          {renderCard(c)}
        </div>
      ))}
      {won && !prefersReducedMotion &&
        cascade.map((c, i) => (
          <div
            key={i}
            className="absolute transition-transform duration-1000 ease-[cubic-bezier(0.22,1,0.36,1)]"
            style={{
              transform: `translate(${c.x}px, ${c.y}px) rotate(${c.angle}deg)`,
              boxShadow: '0 8px 16px rgba(0,0,0,0.3)',
            }}
          >
            {renderCard(c)}
          </div>
        ))}
      {won && (
        <div
          className={`absolute inset-0 flex items-center justify-center bg-black bg-opacity-80 text-2xl ${
            !prefersReducedMotion ? 'animate-pulse' : ''
          }`}
          role="alert"
        >
          You win!
        </div>
      )}
      <div className="flex justify-between mb-2 flex-wrap gap-2">
        <div>Score: {vegasScore}</div>
        <div>Bankroll: {bankroll}</div>
        <div>Redeals: {game.redeals === Infinity ? '∞' : game.redeals}</div>
        <div>Mode: {winnableOnly ? 'Winnable' : 'Random'}</div>
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
          onClick={showHint}
        >
          Hint
        </button>
        <button
          className="px-2 py-1 bg-gray-700 hover:bg-gray-600 rounded"
          onClick={runSolver}
        >
          Solve
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
        <button
          className="px-2 py-1 bg-gray-700 hover:bg-gray-600 rounded"
          onClick={() => {
            const opts = [3, 1, Infinity];
            const next = opts[(opts.indexOf(passLimit) + 1) % opts.length];
            ReactGA.event({
              category: 'Solitaire',
              action: 'variant_select',
              label: `passes_${next === Infinity ? 'unlimited' : next}`,
            });
            setPassLimit(next);
          }}
        >
          Passes {passLimit === Infinity ? '∞' : passLimit}
        </button>
        <label className="flex items-center space-x-1">
          <input
            type="checkbox"
            checked={winnableOnly}
            onChange={(e) => setWinnableOnly(e.target.checked)}
          />
          <span className="select-none">Winnable Only</span>
        </label>
      </div>
      <div className="flex space-x-4 mb-4">
        <div className="w-16 h-24 min-w-[24px] min-h-[24px]" onClick={draw}>
          {game.stock.length ? renderFaceDown() : <div />}
        </div>
        <div className="w-16 h-24 min-w-[24px] min-h-[24px]" onDragOver={(e) => e.preventDefault()}>
          {game.waste.length ? (
            <div
              ref={wasteRef}
              draggable
              onDoubleClick={() => handleDoubleClick('waste', 0)}
              onDragStart={(e) => handleDragStart('waste', -1, game.waste.length - 1, e)}
              onDragEnd={handleDragEnd}
              className={`${
                drag && drag.source === 'waste'
                  ? 'opacity-0'
                  : ''
              } ${hint && hint.source === 'waste' ? 'ring-4 ring-yellow-400' : ''} ${
                !prefersReducedMotion ? 'transition-transform' : ''
              }`}
            >
              {renderCard(game.waste[game.waste.length - 1])}
            </div>
          ) : (
            <div className="w-16 h-24 min-w-[24px] min-h-[24px]" />
          )}
        </div>
        {game.foundations.map((pile, i) => (
          <div
            key={`f-${i}`}
            className="w-16 h-24 min-w-[24px] min-h-[24px]"
            onDragOver={(e) => e.preventDefault()}
            onDrop={() => dropToFoundation(i)}
            ref={(el) => {
              foundationRefs.current[i] = el;
            }}
          >
            {pile.length ? renderCard(pile[pile.length - 1]) : (
              <div className="w-16 h-24 min-w-[24px] min-h-[24px] border border-dashed border-white rounded" />
            )}
          </div>
        ))}
      </div>
      <div className="flex space-x-4">
        {game.tableau.map((pile, i) => (
          <div
            key={`t-${i}`}
            className="relative w-16 h-96 min-w-[24px] border border-black"
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
                    ? 'opacity-0'
                    : ''
                } ${
                  hint &&
                  hint.source === 'tableau' &&
                  hint.pile === i &&
                  hint.index === idx
                    ? 'ring-4 ring-yellow-400'
                    : ''
                }`}
                style={{ top: idx * 24, filter: 'drop-shadow(0 2px 2px rgba(0,0,0,0.3))' }}
                draggable={card.faceUp}
                onDoubleClick={() => handleDoubleClick('tableau', i)}
                onDragStart={(e) => handleDragStart('tableau', i, idx, e)}
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
