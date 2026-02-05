import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { logEvent } from '../../../utils/analytics';
import usePrefersReducedMotion from '../../../hooks/usePrefersReducedMotion';
import {
  initializeGame,
  drawFromStock,
  moveTableauToTableau,
  moveWasteToTableau,
  moveToFoundation,
  autoComplete,
  canDropOnFoundation,
  canDropOnTableau,
  isValidTableauRun,
  valueToString,
  GameState,
  Card,
  DragPayload,
  createDeck,
  findHint,
  suits,
  Suit,
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
  totalHints: number;
  totalUndos: number;
  autoFinishes: number;
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

const controlButtonClasses =
  'group relative rounded-md border border-kali-border/60 bg-[color:color-mix(in_srgb,var(--color-surface-muted)_80%,rgba(9,34,52,0.92)_20%)] px-3 py-1.5 text-sm font-semibold text-kali-text shadow-[0_3px_6px_rgba(0,0,0,0.35)] transition-all duration-200 hover:-translate-y-[1px] hover:border-kali-accent/70 hover:bg-[color:color-mix(in_srgb,var(--color-surface)_75%,rgba(25,116,186,0.35)_25%)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-kali-focus disabled:cursor-not-allowed disabled:opacity-60';

const CARD_FACE_TEXTURE = '/apps/solitaire/card-front.svg';
const CARD_BACK_TEXTURE = '/apps/solitaire/card-back.svg';
const TABLE_FELT_TEXTURE = '/apps/solitaire/felt-texture.svg';
const suitLabels: Record<Suit, string> = {
  '♠': 'spades',
  '♥': 'hearts',
  '♦': 'diamonds',
  '♣': 'clubs',
};

const CardView: React.FC<{
  card: Card;
  faceDown?: boolean;
  reducedMotion: boolean;
  style?: React.CSSProperties;
  className?: string;
  disableFlip?: boolean;
}> = ({
  card,
  faceDown = false,
  reducedMotion,
  style,
  className = '',
  disableFlip = false,
}) => {
  const [showFront, setShowFront] = useState(!faceDown);
  const prev = useRef(!faceDown);

  useEffect(() => {
    if (disableFlip || reducedMotion) {
      setShowFront(!faceDown);
      prev.current = !faceDown;
      return;
    }
    const next = !faceDown;
    if (prev.current !== next) {
      requestAnimationFrame(() => {
        setShowFront(next);
      });
      prev.current = next;
    }
  }, [faceDown, disableFlip, reducedMotion]);

  return (
    <div
      className={`sol-card ${showFront ? 'sol-card-front' : 'sol-card-back'} ${
        card.color === 'red' ? 'sol-card-red' : 'sol-card-black'
      } ${className}`}
      style={style}
    >
      <div className="sol-card-inner">
        <div className="sol-card-face sol-card-face-front">
          <div className="sol-card-corner sol-card-corner--top">
            <span>{valueToString(card.value)}</span>
            <span aria-hidden="true">{card.suit}</span>
          </div>
          <div className="sol-card-suit" aria-hidden="true">
            {card.suit}
          </div>
          <div className="sol-card-corner sol-card-corner--bottom">
            <span>{valueToString(card.value)}</span>
            <span aria-hidden="true">{card.suit}</span>
          </div>
        </div>
        <div className="sol-card-face sol-card-face-back" />
      </div>
    </div>
  );
};

const Solitaire = () => {
  const [drawMode, setDrawMode] = useState<1 | 3>(1);
  const [passLimit, setPassLimit] = useState<number>(3);
  const [variant, setVariant] = useState<Variant>('klondike');
  const [game, setGame] = useState<GameState>(() =>
    initializeGame(drawMode, undefined, undefined, passLimit),
  );
  const [drag, setDrag] = useState<DragPayload | null>(null);
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
    totalHints: 0,
    totalUndos: 0,
    autoFinishes: 0,
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
  const dragLayerRef = useRef<HTMLDivElement | null>(null);
  const dragRef = useRef<DragPayload | null>(null);
  const dragHandledRef = useRef(false);
  const pointerDragRef = useRef<{ pointerId: number; offsetX: number; offsetY: number } | null>(
    null,
  );
  const [hoverTarget, setHoverTarget] = useState<{ type: 'tableau' | 'foundation'; index: number } | null>(null);
  const hoverTargetRef = useRef<{ type: 'tableau' | 'foundation'; index: number } | null>(null);
  const [invalidDrop, setInvalidDrop] = useState<{ id: number; payload: DragPayload } | null>(null);
  const [flying, setFlying] = useState<AnimatedCard[]>([]);
  const [autoCompleting, setAutoCompleting] = useState(false);
  const [winnableOnly, setWinnableOnly] = useState(false);
  const [hint, setHint] = useState<{ source: 'tableau' | 'waste'; pile: number; index: number } | null>(null);
  const [bankroll, setBankroll] = useState(0);
  const [bankrollReady, setBankrollReady] = useState(false);
  const foundationCountRef = useRef(0);
  const [history, setHistory] = useState<GameState[]>([]);
  const historyGuardRef = useRef(false);
  const [isShuffling, setIsShuffling] = useState(false);
  const [confettiSeed, setConfettiSeed] = useState(0);
  const statsKey = useMemo(
    () => getStatsKey(variant, drawMode, passLimit),
    [variant, drawMode, passLimit],
  );
  const supportsNativeDrag = useMemo(() => {
    if (typeof window === 'undefined' || typeof document === 'undefined') return false;
    return 'draggable' in document.createElement('div');
  }, []);

  const cardVerticalOffset = useMemo(() => {
    if (scale < 0.7) return 18;
    if (scale < 0.85) return 24;
    if (scale < 0.95) return 28;
    return 32;
  }, [scale]);

  const confettiPieces = useMemo(() => {
    if (prefersReducedMotion) return [] as { id: string; left: number; delay: number; hue: number }[];
    const total = 24;
    const pieces: { id: string; left: number; delay: number; hue: number }[] = [];
    for (let i = 0; i < total; i += 1) {
      pieces.push({
        id: `${confettiSeed}-${i}`,
        left: ((confettiSeed * 19 + i * 37) % 90) + 5,
        delay: (i * 90) % 900,
        hue: (confettiSeed * 11 + i * 23) % 360,
      });
    }
    return pieces;
  }, [confettiSeed, prefersReducedMotion]);

  const updateStats = useCallback(
    (updater: (prev: Stats) => Stats) => {
      setStats((prev) => {
        const next = updater(prev);
        if (typeof window !== 'undefined') {
          localStorage.setItem(statsKey, JSON.stringify(next));
        }
        return next;
      });
    },
    [statsKey],
  );

  const applyMove = useCallback(
    (
      updater: (state: GameState) => GameState,
      options: { countMove?: boolean; trackHistory?: boolean } = {},
    ) => {
      const { countMove = true, trackHistory = true } = options;
      let changed = false;
      setGame((prev) => {
        const next = updater(prev);
        if (next !== prev) {
          changed = true;
          if (!historyGuardRef.current && trackHistory) {
            setHistory((h) => [...h.slice(-99), prev]);
          }
          if (countMove && !historyGuardRef.current) {
            setMoves((m) => m + 1);
          }
        }
        historyGuardRef.current = false;
        return next;
      });
      return changed;
    },
    [],
  );

  const recordManualMove = useCallback((snapshot: GameState, moveCount = 1) => {
    setHistory((h) => [...h.slice(-99), snapshot]);
    setMoves((m) => m + moveCount);
  }, []);

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
    const saved = JSON.parse(localStorage.getItem(statsKey) || '{}');
    setStats({
      gamesPlayed: 0,
      gamesWon: 0,
      bestScore: 0,
      bestTime: 0,
      dailyStreak: 0,
      lastDaily: null,
      totalHints: 0,
      totalUndos: 0,
      autoFinishes: 0,
      ...saved,
    });
  }, [statsKey]);

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
      if (!prefersReducedMotion && typeof window !== 'undefined') {
        setIsShuffling(true);
        window.setTimeout(() => setIsShuffling(false), 900);
      }
      historyGuardRef.current = true;
      setGame(initializeGame(mode, deck, seed, passLimit));
      setWon(false);
      setCascade([]);
      setConfettiSeed((s) => s + 1);
      setTime(0);
      setMoves(0);
      setHistory([]);
      setHint(null);
      setAutoCompleting(false);
      setIsDaily(daily);
      setAriaMessage('New game started');
      setBankroll((b) => {
        const nb = b - 52;
        if (typeof window !== 'undefined') {
          localStorage.setItem('solitaireBankroll', String(nb));
        }
        return nb;
      });
      foundationCountRef.current = 0;
      updateStats((s) => ({ ...s, gamesPlayed: s.gamesPlayed + 1 }));
    },
    [
      drawMode,
      variant,
      winnableOnly,
      passLimit,
      prefersReducedMotion,
      updateStats,
    ],
  );

  useEffect(() => {
    if (bankrollReady && variant === 'klondike') start(drawMode, variant);
  }, [drawMode, variant, start, bankrollReady]);

  const vegasScore =
    game.foundations.reduce((sum, p) => sum + p.length, 0) * 5 - 52;

  useEffect(() => {
    if (!won) return;
    if (timer.current) clearInterval(timer.current);
    updateStats((s) => {
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
      return {
        ...s,
        gamesWon: s.gamesWon + 1,
        bestScore,
        bestTime,
        dailyStreak,
        lastDaily,
      };
    });
    setConfettiSeed((s) => s + 1);
  }, [won, isDaily, time, vegasScore, updateStats]);

  useEffect(() => {
    if (paused || won) {
      if (timer.current) clearInterval(timer.current);
      return;
    }
    timer.current = setInterval(() => setTime((t) => t + 1), 1000);
    return () => {
      if (timer.current) clearInterval(timer.current);
    };
  }, [paused, won]);

  useEffect(() => {
    if (game.foundations.every((p) => p.length === 13)) {
      setWon(true);
      logEvent({ category: 'Solitaire', action: 'win' });
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

  const draw = () => {
    const changed = applyMove((g) => drawFromStock(g));
    if (changed) {
      logEvent({ category: 'Solitaire', action: 'move', label: 'draw' });
      setAriaMessage('Drew cards from stock');
    } else if (!game.stock.length && game.redeals === 0) {
      setAriaMessage('No redeals remaining');
    }
  };

  const describeCard = useCallback((card: Card) => {
    const valueMap: Record<string, string> = {
      A: 'Ace',
      J: 'Jack',
      Q: 'Queen',
      K: 'King',
    };
    const text = valueToString(card.value);
    const prefix = valueMap[text] || text;
    return `${prefix} of ${suitLabels[card.suit]}`;
  }, []);

  const showHint = () => {
    const h = findHint(game);
    if (h) {
      setHint(h);
      updateStats((s) => ({ ...s, totalHints: s.totalHints + 1 }));
      setAriaMessage('Hint highlighted a possible move');
    } else {
      setAriaMessage('No hints available');
    }
  };

  const setDragState = useCallback((payload: DragPayload | null) => {
    dragRef.current = payload;
    setDrag(payload);
    if (!payload) {
      dragHandledRef.current = false;
      setHoverTarget(null);
      hoverTargetRef.current = null;
    }
  }, []);

  const clearDragVisuals = useCallback(() => {
    if (dragImageRef.current) {
      document.body.removeChild(dragImageRef.current);
      dragImageRef.current = null;
    }
    if (dragLayerRef.current) {
      document.body.removeChild(dragLayerRef.current);
      dragLayerRef.current = null;
    }
    if (dragCardRef.current) {
      dragCardRef.current.style.opacity = '';
      dragCardRef.current = null;
    }
  }, []);

  const triggerInvalidDrop = useCallback((payload: DragPayload) => {
    const id = Date.now();
    setInvalidDrop({ id, payload });
    setTimeout(() => {
      setInvalidDrop((current) => (current?.id === id ? null : current));
    }, 500);
    setAriaMessage('Invalid move');
  }, []);

  const finishDrag = useCallback(() => {
    clearDragVisuals();
    pointerDragRef.current = null;
    setDragState(null);
  }, [clearDragVisuals, setDragState]);

  const isInside = useCallback(
    (rect: DOMRect, x: number, y: number) =>
      x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom,
    [],
  );

  const resolveDropTarget = useCallback((x: number, y: number) => {
    const foundationIndex = foundationRefs.current.findIndex(
      (ref) => ref && isInside(ref.getBoundingClientRect(), x, y),
    );
    if (foundationIndex !== -1) {
      return { type: 'foundation' as const, index: foundationIndex };
    }
    const tableauIndex = tableauRefs.current.findIndex(
      (ref) => ref && isInside(ref.getBoundingClientRect(), x, y),
    );
    if (tableauIndex !== -1) {
      return { type: 'tableau' as const, index: tableauIndex };
    }
    return null;
  }, [isInside]);


  const handleDragStart = (
    source: 'tableau' | 'waste',
    pile: number,
    index: number,
    e: React.DragEvent<HTMLDivElement>,
  ) => {
    if (source === 'tableau') {
      const slice = game.tableau[pile].slice(index);
      if (!isValidTableauRun(slice)) return;
      setDragState({ source, pile, index });
    } else if (source === 'waste' && game.waste.length) {
      setDragState({ source, pile: -1, index: game.waste.length - 1 });
    }
    dragHandledRef.current = false;
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

  const handleDragEnd = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
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
        historyGuardRef.current = true;
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
            (fromState.tableau[pile!].length - 1) * cardVerticalOffset;
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
      historyGuardRef.current = true;
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
        historyGuardRef.current = true;
        setGame(toState);
        cb();
      }, 300);
    },
    [foundationRefs, tableauRefs, wasteRef, rootRef, scale, cardVerticalOffset],
  );

  const runSolver = useCallback(() => {
    const moves = solve(game);
    const play = (index: number, g: GameState) => {
      if (index >= moves.length) return;
      const m = moves[index];
      let next = g;
      if (m.type === 'draw') {
        next = drawFromStock(g);
        historyGuardRef.current = true;
        setGame(next);
        setTimeout(() => play(index + 1, next), 300);
        return;
      }
      if (m.type === 'wasteToTableau') {
        next = moveWasteToTableau(g, m.to);
        historyGuardRef.current = true;
        setGame(next);
        setTimeout(() => play(index + 1, next), 300);
        return;
      }
      if (m.type === 'tableauToTableau') {
        next = moveTableauToTableau(g, m.from, m.index, m.to);
        historyGuardRef.current = true;
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

  const dropToTableau = (pileIndex: number, payload: DragPayload | null) => {
    if (!payload || dragHandledRef.current) return;
    dragHandledRef.current = true;
    if (!canDropOnTableau(game, payload, pileIndex)) {
      triggerInvalidDrop(payload);
      finishDrag();
      return;
    }
    let moved = false;
    if (payload.source === 'tableau') {
      moved = applyMove((g) =>
        moveTableauToTableau(g, payload.pile, payload.index, pileIndex),
      );
    } else {
      moved = applyMove((g) => moveWasteToTableau(g, pileIndex));
    }
    if (moved) {
      logEvent({ category: 'Solitaire', action: 'move', label: 'tableau' });
      setAriaMessage('Moved cards to tableau');
    }
    finishDrag();
  };

  const dropToFoundation = (pileIndex: number, payload: DragPayload | null) => {
    if (!payload || dragHandledRef.current) return;
    dragHandledRef.current = true;
    if (!canDropOnFoundation(game, payload, pileIndex)) {
      triggerInvalidDrop(payload);
      finishDrag();
      return;
    }
    if (payload.source === 'tableau') {
      const current = game;
      const next = moveToFoundation(current, 'tableau', payload.pile);
      if (next !== current) {
        recordManualMove(current);
        logEvent({ category: 'Solitaire', action: 'move', label: 'foundation' });
        flyMove(current, next, 'tableau', payload.pile, () =>
          setAriaMessage('Moved card to foundation'),
        );
      }
    } else {
      const current = game;
      const next = moveToFoundation(current, 'waste', null);
      if (next !== current) {
        recordManualMove(current);
        logEvent({ category: 'Solitaire', action: 'move', label: 'foundation' });
        flyMove(current, next, 'waste', null, () =>
          setAriaMessage('Moved card to foundation'),
        );
      }
    }
    finishDrag();
  };

  const handlePointerMove = useCallback(
    (event: PointerEvent) => {
      if (!pointerDragRef.current || event.pointerId !== pointerDragRef.current.pointerId) return;
      if (dragLayerRef.current) {
        const { offsetX, offsetY } = pointerDragRef.current;
        dragLayerRef.current.style.transform = `translate(${event.clientX - offsetX}px, ${
          event.clientY - offsetY
        }px)`;
      }
      const target = resolveDropTarget(event.clientX, event.clientY);
      hoverTargetRef.current = target;
      setHoverTarget(target);
    },
    [resolveDropTarget],
  );

  const handlePointerUp = useCallback(
    (event: PointerEvent) => {
      if (!pointerDragRef.current || event.pointerId !== pointerDragRef.current.pointerId) return;
      if (typeof window !== 'undefined') {
        window.removeEventListener('pointermove', handlePointerMove);
        window.removeEventListener('pointerup', handlePointerUp);
        window.removeEventListener('pointercancel', handlePointerUp);
      }
      const target = hoverTargetRef.current || resolveDropTarget(event.clientX, event.clientY);
      if (target?.type === 'foundation') {
        dropToFoundation(target.index, dragRef.current);
        return;
      }
      if (target?.type === 'tableau') {
        dropToTableau(target.index, dragRef.current);
        return;
      }
      finishDrag();
    },
    [dropToFoundation, dropToTableau, finishDrag, handlePointerMove, resolveDropTarget],
  );

  const handlePointerDown = (
    source: 'tableau' | 'waste',
    pile: number,
    index: number,
  ) => (event: React.PointerEvent<HTMLDivElement>) => {
    const usePointerDrag = event.pointerType === 'touch' || !supportsNativeDrag;
    if (!usePointerDrag) return;
    if (source === 'tableau') {
      const slice = game.tableau[pile].slice(index);
      if (!isValidTableauRun(slice)) return;
      setDragState({ source, pile, index });
    } else {
      if (!game.waste.length) return;
      setDragState({ source, pile: -1, index: game.waste.length - 1 });
    }
    dragHandledRef.current = false;
    const target = event.currentTarget as HTMLDivElement;
    dragCardRef.current = target;
    dragCardRef.current.style.opacity = '0';
    const rect = target.getBoundingClientRect();
    const offsetX = event.clientX - rect.left;
    const offsetY = event.clientY - rect.top;
    const layer = target.cloneNode(true) as HTMLDivElement;
    layer.style.position = 'fixed';
    layer.style.pointerEvents = 'none';
    layer.style.top = '0';
    layer.style.left = '0';
    layer.style.zIndex = '9999';
    layer.style.transform = `translate(${event.clientX - offsetX}px, ${
      event.clientY - offsetY
    }px)`;
    document.body.appendChild(layer);
    dragLayerRef.current = layer;
    pointerDragRef.current = { pointerId: event.pointerId, offsetX, offsetY };
    event.currentTarget.setPointerCapture(event.pointerId);
    if (typeof window !== 'undefined') {
      window.addEventListener('pointermove', handlePointerMove);
      window.addEventListener('pointerup', handlePointerUp);
      window.addEventListener('pointercancel', handlePointerUp);
    }
    event.preventDefault();
  };

  const handleDoubleClick = (source: 'tableau' | 'waste', pile: number) => {
    const current = game;
    const next = moveToFoundation(
      current,
      source,
      source === 'tableau' ? pile : null,
    );
    if (next !== current) {
      logEvent({ category: 'Solitaire', action: 'move', label: 'auto' });
      recordManualMove(current);
      flyMove(
        current,
        next,
        source,
        source === 'tableau' ? pile : null,
      );
    }
  };

  const undo = useCallback(() => {
    setHistory((h) => {
      if (!h.length) {
        setAriaMessage('Nothing to undo');
        return h;
      }
      const prevState = h[h.length - 1];
      historyGuardRef.current = true;
      setGame(prevState);
      setMoves((m) => (m > 0 ? m - 1 : 0));
      setWon(false);
      setCascade([]);
      setConfettiSeed((s) => s + 1);
      updateStats((s) => ({ ...s, totalUndos: s.totalUndos + 1 }));
      setAriaMessage('Undid last move');
      return h.slice(0, -1);
    });
  }, [updateStats]);

  const handleStockKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      draw();
    }
  };

  const handleWasteKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (!game.waste.length) return;
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleDoubleClick('waste', 0);
      return;
    }
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
      e.preventDefault();
      for (let i = 0; i < game.tableau.length; i += 1) {
        const moved = applyMove((state) => moveWasteToTableau(state, i));
        if (moved) {
          logEvent({ category: 'Solitaire', action: 'move', label: 'keyboard' });
          setAriaMessage('Moved waste card to tableau');
          return;
        }
      }
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      handleDoubleClick('waste', 0);
    }
  };

  const handleTableauKeyDown = (pileIndex: number) =>
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      const pile = game.tableau[pileIndex];
      if (!pile.length) return;
      const top = pile[pile.length - 1];
      if (!top.faceUp) return;
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        handleDoubleClick('tableau', pileIndex);
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        handleDoubleClick('tableau', pileIndex);
        return;
      }
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        for (let i = 0; i < game.tableau.length; i += 1) {
          if (i === pileIndex) continue;
          const moved = applyMove((state) => {
            const length = state.tableau[pileIndex].length;
            if (length === 0) return state;
            return moveTableauToTableau(state, pileIndex, length - 1, i);
          });
          if (moved) {
            logEvent({ category: 'Solitaire', action: 'move', label: 'keyboard' });
            setAriaMessage('Moved tableau card to another pile');
            return;
          }
        }
      }
    };

  const bestSummary = stats.bestScore
    ? `${stats.bestScore} (${stats.bestTime || 0}s)`
    : 'N/A';
  const redealLabel = game.redeals === Infinity ? '∞' : game.redeals;
  const modeLabel = winnableOnly ? 'Winnable deals' : 'Random deals';
  const statChips = [
    { label: 'Score', value: vegasScore },
    { label: 'Bankroll', value: bankroll },
    { label: 'Redeals', value: redealLabel },
    { label: 'Mode', value: modeLabel },
    { label: 'Best', value: bestSummary },
    { label: 'Wins', value: `${stats.gamesWon}/${stats.gamesPlayed}` },
    { label: 'Daily Streak', value: stats.dailyStreak },
    { label: 'Hints', value: stats.totalHints },
    { label: 'Undos', value: stats.totalUndos },
    { label: 'Auto-finish', value: stats.autoFinishes },
  ];

  const autoCompleteNext = useCallback(
    (g: GameState) => {
      let next = moveToFoundation(g, 'waste', null);
      if (next !== g) {
        logEvent({ category: 'Solitaire', action: 'move', label: 'auto' });
        recordManualMove(g);
        flyMove(g, next, 'waste', null, () => autoCompleteNext(next));
        return;
      }
      for (let i = 0; i < g.tableau.length; i += 1) {
        next = moveToFoundation(g, 'tableau', i);
        if (next !== g) {
          logEvent({ category: 'Solitaire', action: 'move', label: 'auto' });
          recordManualMove(g);
          flyMove(g, next, 'tableau', i, () => autoCompleteNext(next));
          return;
        }
      }
      setAutoCompleting(false);
    },
    [flyMove, recordManualMove],
  );

  const startAutoComplete = useCallback(
    (state: GameState, manual: boolean) => {
      if (autoCompleting) return;
      if (prefersReducedMotion) {
        const next = autoComplete(state);
        if (next !== state) {
          const movedCards =
            next.foundations.reduce((sum, pile) => sum + pile.length, 0) -
            state.foundations.reduce((sum, pile) => sum + pile.length, 0);
          if (movedCards > 0) {
            recordManualMove(state, movedCards);
          }
          if (manual) {
            updateStats((s) => ({ ...s, autoFinishes: s.autoFinishes + 1 }));
          }
          historyGuardRef.current = true;
          setGame(next);
          setAriaMessage('Auto-complete finished the game');
        }
        return;
      }
      if (manual) {
        updateStats((s) => ({ ...s, autoFinishes: s.autoFinishes + 1 }));
      }
      setAutoCompleting(true);
      setAriaMessage('Auto-completing remaining moves');
      autoCompleteNext(state);
    },
    [
      autoCompleting,
      prefersReducedMotion,
      recordManualMove,
      updateStats,
      autoCompleteNext,
    ],
  );

  const handleAutoCompleteClick = useCallback(() => {
    startAutoComplete(game, true);
  }, [game, startAutoComplete]);

  useEffect(() => {
    if (
      !autoCompleting &&
      game.stock.length === 0 &&
      game.tableau.every((p) => p.every((c) => c.faceUp))
    ) {
      startAutoComplete(game, false);
    }
  }, [autoCompleting, game, startAutoComplete]);
  if (variant !== 'klondike') {
    return (
      <div className="h-full w-full select-none bg-[color:color-mix(in_srgb,var(--color-surface-muted)_88%,rgba(8,16,24,0.9)_12%)] p-3 text-kali-text">
        <div className="mb-4 flex justify-end">
          <select
            className={`${controlButtonClasses} px-3 py-1`}
            aria-label="Change solitaire variant"
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
        <div className="flex h-full flex-col items-center justify-center gap-4 text-center">
          <p className="text-xl font-semibold text-kali-accent">
            {`${variant.charAt(0).toUpperCase() + variant.slice(1)} is loading soon.`}
          </p>
          <button
            type="button"
            className={controlButtonClasses}
            onClick={() => setVariant('klondike')}
          >
            Return to Klondike
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={rootRef}
      className="relative h-full w-full overflow-hidden text-kali-text"
      style={{
        transform: `scale(${scale})`,
        transformOrigin: 'top left',
        backgroundImage: `linear-gradient(120deg, rgba(4,10,18,0.88), rgba(9,40,62,0.85)), url(${TABLE_FELT_TEXTURE})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
    >
      <div className="pointer-events-none absolute inset-x-0 top-0 flex justify-between px-4 py-2 text-xs font-semibold sm:text-sm">
        <span className="rounded-full bg-black/35 px-3 py-1 shadow-sm">Moves: {moves}</span>
        <span className="rounded-full bg-black/35 px-3 py-1 shadow-sm">Time: {time}s</span>
      </div>
      <div aria-live="polite" className="sr-only">
        {ariaMessage}
      </div>
      {paused && (
        <div
          className="absolute inset-0 z-50 flex items-center justify-center bg-kali-overlay/90 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
        >
          <button
            type="button"
            onClick={resume}
            className="rounded border border-kali-border/60 bg-kali-dark px-4 py-2 text-sm font-semibold text-kali-text shadow transition-colors hover:bg-[color:color-mix(in_srgb,var(--color-surface)_70%,rgba(15,148,210,0.2)_30%)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-kali-focus"
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
          <CardView card={c} reducedMotion={prefersReducedMotion} disableFlip />
        </div>
      ))}
      {won && !prefersReducedMotion &&
        cascade.map((c, i) => (
          <div
            key={`cascade-${i}`}
            className="absolute transition-transform duration-[1200ms] ease-[cubic-bezier(0.22,1,0.36,1)]"
            style={{
              transform: `translate(${c.x}px, ${c.y}px) rotate(${c.angle}deg)`,
            }}
          >
            <CardView card={c} reducedMotion={prefersReducedMotion} disableFlip />
          </div>
        ))}
      {won && !prefersReducedMotion &&
        confettiPieces.map((piece) => (
          <span
            key={piece.id}
            className="sol-confetti"
            style={{
              left: `${piece.left}%`,
              animationDelay: `${piece.delay}ms`,
              background: `linear-gradient(135deg, hsl(${piece.hue} 85% 65%), hsl(${(piece.hue + 40) % 360} 85% 55%))`,
            }}
          />
        ))}
      {won && (
        <div className="sol-victory-overlay" role="alert" aria-live="assertive">
          <div className="sol-victory-card">
            <h2 className="text-2xl font-semibold text-kali-accent">You win!</h2>
            <p className="mt-2 text-sm text-kali-subtle">
              Vegas score {vegasScore} • {time}s • {moves} moves
            </p>
            <div className="mt-4 flex flex-wrap justify-center gap-3">
              <button
                type="button"
                className={controlButtonClasses}
                onClick={() => start(drawMode, variant, isDaily)}
              >
                New Deal
              </button>
              <button
                type="button"
                className={controlButtonClasses}
                onClick={() => start(drawMode, variant, true)}
              >
                Daily Deal
              </button>
            </div>
          </div>
        </div>
      )}
      <div className="relative flex h-full flex-col gap-4 pt-12">
        <div className="rounded-xl bg-black/30 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur-sm">
          <div className="flex flex-wrap items-center gap-2 text-xs sm:text-sm">
            {statChips.map((chip) => (
              <div
                key={chip.label}
                className="rounded-full bg-black/35 px-3 py-1 font-semibold shadow-inner shadow-black/60"
              >
                {chip.label}:{' '}
                <span className="text-kali-accent">{chip.value}</span>
              </div>
            ))}
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <select
              className={`${controlButtonClasses} px-3 py-1`}
              aria-label="Set solitaire variant"
              value={variant}
              onChange={(e) => {
                const v = e.target.value as Variant;
                logEvent({ category: 'Solitaire', action: 'variant_select', label: v });
                setVariant(v);
              }}
            >
              <option value="klondike">Klondike</option>
              <option value="spider">Spider</option>
              <option value="freecell">FreeCell</option>
            </select>
            <button
              type="button"
              className={controlButtonClasses}
              onClick={() => start(drawMode, variant, true)}
              title="Deal the daily seed"
            >
              Daily Deal
            </button>
            <button
              type="button"
              className={controlButtonClasses}
              onClick={showHint}
              title="Highlight a playable move"
            >
              Hint
            </button>
            <button
              type="button"
              className={controlButtonClasses}
              onClick={undo}
              disabled={!history.length}
              title="Undo the last move"
            >
              Undo
            </button>
            <button
              type="button"
              className={controlButtonClasses}
              onClick={handleAutoCompleteClick}
              disabled={autoCompleting}
              title="Move all remaining cards to the foundations"
            >
              Auto-complete
            </button>
            <button
              type="button"
              className={controlButtonClasses}
              onClick={runSolver}
              title="Let the solver demonstrate a win"
            >
              Solve
            </button>
            <button
              type="button"
              className={controlButtonClasses}
              onClick={() => {
                const mode = drawMode === 1 ? 3 : 1;
                logEvent({
                  category: 'Solitaire',
                  action: 'variant_select',
                  label: mode === 1 ? 'draw1' : 'draw3',
                });
                setDrawMode(mode);
              }}
              title="Toggle draw mode"
            >
              Draw {drawMode === 1 ? '1' : '3'}
            </button>
            <button
              type="button"
              className={controlButtonClasses}
              onClick={() => {
                const opts = [3, 1, Infinity];
                const next = opts[(opts.indexOf(passLimit) + 1) % opts.length];
                logEvent({
                  category: 'Solitaire',
                  action: 'variant_select',
                  label: `passes_${next === Infinity ? 'unlimited' : next}`,
                });
                setPassLimit(next);
              }}
              title="Cycle redeal limit"
            >
              Passes {passLimit === Infinity ? '∞' : passLimit}
            </button>
            <label className="flex items-center space-x-1 text-xs font-semibold uppercase tracking-wider text-kali-subtle">
              <input
                type="checkbox"
                checked={winnableOnly}
                onChange={(e) => setWinnableOnly(e.target.checked)}
                aria-label="Toggle winnable deals only"
              />
              <span className="select-none">Winnable Only</span>
            </label>
            <button
              type="button"
              className={controlButtonClasses}
              onClick={() => start(drawMode, variant, isDaily)}
              title="Restart this deal"
            >
              Restart
            </button>
          </div>
        </div>
        <div className="flex flex-wrap items-start gap-4 rounded-xl bg-black/25 p-4 shadow-inner shadow-black/70">
          <div className="flex flex-col items-center gap-2">
            <span className="text-[0.7rem] uppercase tracking-widest text-kali-subtle">Stock</span>
            <div
              role="button"
              tabIndex={0}
              onClick={draw}
              onKeyDown={handleStockKeyDown}
              aria-label={game.stock.length ? `${game.stock.length} cards in stock` : 'Empty stock pile'}
              className="focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-kali-focus"
            >
              {game.stock.length ? (
                <CardView
                  card={{ ...game.stock[game.stock.length - 1], faceUp: false }}
                  faceDown
                  reducedMotion={prefersReducedMotion}
                  disableFlip
                  className={isShuffling ? 'sol-card-shuffle' : ''}
                />
              ) : (
                <div className="sol-slot" aria-hidden="true" />
              )}
            </div>
          </div>
          <div className="flex flex-col items-center gap-2">
            <span className="text-[0.7rem] uppercase tracking-widest text-kali-subtle">Waste</span>
            <div
              ref={wasteRef}
              role="button"
              tabIndex={game.waste.length ? 0 : -1}
              aria-label={game.waste.length ? `Waste card ${describeCard(game.waste[game.waste.length - 1])}` : 'Empty waste pile'}
              onKeyDown={handleWasteKeyDown}
              onDoubleClick={() => handleDoubleClick('waste', 0)}
              draggable={!!game.waste.length && supportsNativeDrag}
              onDragStart={(e) => handleDragStart('waste', -1, game.waste.length - 1, e)}
              onDragEnd={handleDragEnd}
              onPointerDown={game.waste.length ? handlePointerDown('waste', -1, game.waste.length - 1) : undefined}
              className={`focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-kali-focus ${
                drag && drag.source === 'waste' ? 'opacity-0' : ''
              } ${
                hint && hint.source === 'waste' ? 'ring-4 ring-yellow-400/80' : ''
              } ${
                invalidDrop && invalidDrop.payload.source === 'waste' ? 'sol-invalid' : ''
              }`}
            >
              {game.waste.length ? (
                <CardView
                  card={game.waste[game.waste.length - 1]}
                  reducedMotion={prefersReducedMotion}
                />
              ) : (
                <div className="sol-slot" aria-hidden="true" />
              )}
            </div>
          </div>
          <div className="ml-auto flex flex-wrap gap-4">
            {game.foundations.map((pile, i) => {
              const canDrop = drag ? canDropOnFoundation(game, drag, i) : false;
              const isHovered = hoverTarget?.type === 'foundation' && hoverTarget.index === i;
              return (
                <div key={`f-${i}`} className="flex flex-col items-center gap-2">
                <span className="text-[0.7rem] uppercase tracking-widest text-kali-subtle">Foundation {i + 1}</span>
                <div
                  ref={(el) => {
                    foundationRefs.current[i] = el;
                  }}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault();
                    dropToFoundation(i, dragRef.current);
                  }}
                  className={`focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-kali-focus ${
                    canDrop ? 'sol-drop-target' : ''
                  } ${isHovered ? 'sol-drop-target-active' : ''}`}
                >
                  {pile.length ? (
                    <CardView
                      card={pile[pile.length - 1]}
                      reducedMotion={prefersReducedMotion}
                      disableFlip
                    />
                  ) : (
                    <div className="sol-slot" aria-label={`Empty foundation slot ${i + 1}`} />
                  )}
                </div>
              </div>
              );
            })}
          </div>
        </div>
        <div className="flex flex-1 flex-wrap items-start gap-4 rounded-xl bg-black/20 p-4 shadow-inner shadow-black/70">
          {game.tableau.map((pile, i) => {
            const canDrop = drag ? canDropOnTableau(game, drag, i) : false;
            const isHovered = hoverTarget?.type === 'tableau' && hoverTarget.index === i;
            return (
              <div
                key={`t-${i}`}
                ref={(el) => {
                  tableauRefs.current[i] = el;
                }}
                className={`relative flex-1 rounded-xl border border-white/5 bg-black/25 px-1 pb-4 pt-2 shadow-[0_18px_30px_rgba(0,0,0,0.45)] ${
                  canDrop ? 'sol-drop-target' : ''
                } ${isHovered ? 'sol-drop-target-active' : ''}`}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  dropToTableau(i, dragRef.current);
                }}
              >
              {pile.length === 0 && (
                <div className="sol-slot mx-auto" aria-label={`Empty tableau pile ${i + 1}`} />
              )}
              {pile.map((card, idx) => {
                const isTop = idx === pile.length - 1;
                const canDrag = isValidTableauRun(pile.slice(idx));
                const highlighted =
                  hint &&
                  hint.source === 'tableau' &&
                  hint.pile === i &&
                  hint.index === idx;
                const invalid =
                  invalidDrop &&
                  invalidDrop.payload.source === 'tableau' &&
                  invalidDrop.payload.pile === i &&
                  idx >= invalidDrop.payload.index;
                return (
                  <div
                    key={`${card.suit}-${card.value}-${idx}`}
                    className={`absolute ${
                      !prefersReducedMotion ? 'transition-transform duration-300' : ''
                    } ${
                      drag &&
                      drag.source === 'tableau' &&
                      drag.pile === i &&
                      idx >= drag.index
                        ? 'opacity-0'
                        : ''
                    } ${highlighted ? 'ring-4 ring-yellow-400/80' : ''} ${
                      invalid ? 'sol-invalid' : ''
                    }`}
                    style={{
                      top: idx * cardVerticalOffset,
                      filter: 'drop-shadow(0 12px 18px rgba(0,0,0,0.45))',
                    }}
                    draggable={canDrag && supportsNativeDrag}
                    onDoubleClick={isTop ? () => handleDoubleClick('tableau', i) : undefined}
                    onDragStart={(e) => handleDragStart('tableau', i, idx, e)}
                    onDragEnd={handleDragEnd}
                    onPointerDown={handlePointerDown('tableau', i, idx)}
                    role={card.faceUp && isTop ? 'button' : undefined}
                    tabIndex={card.faceUp && isTop ? 0 : -1}
                    onKeyDown={card.faceUp && isTop ? handleTableauKeyDown(i) : undefined}
                    aria-label={
                      card.faceUp && isTop
                        ? `Tableau ${i + 1} card ${describeCard(card)}`
                        : undefined
                    }
                  >
                    <CardView
                      card={card}
                      faceDown={!card.faceUp}
                      reducedMotion={prefersReducedMotion}
                    />
                  </div>
                );
              })}
            </div>
            );
          })}
        </div>
      </div>
      <style jsx>{`
        .sol-card {
          width: 4.5rem;
          height: 6.5rem;
          perspective: 1200px;
        }
        .sol-card-inner {
          position: relative;
          width: 100%;
          height: 100%;
          border-radius: 0.65rem;
          transform-style: preserve-3d;
          transition: transform 0.6s cubic-bezier(0.22, 1, 0.36, 1);
          box-shadow: 0 18px 36px rgba(0, 0, 0, 0.45);
          background: transparent;
        }
        .sol-card-back .sol-card-inner {
          transform: rotateY(180deg);
        }
        .sol-card-face {
          position: absolute;
          inset: 0;
          border-radius: 0.65rem;
          backface-visibility: hidden;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          padding: 0.55rem;
        }
        .sol-card-face-front {
          background: linear-gradient(145deg, rgba(255, 255, 255, 0.95), rgba(234, 241, 250, 0.9)),
            url(${CARD_FACE_TEXTURE});
          background-size: cover;
        }
        .sol-card-red .sol-card-face-front {
          color: #fca5a5;
        }
        .sol-card-black .sol-card-face-front {
          color: #e2e8f0;
        }
        .sol-card-face-back {
          background: url(${CARD_BACK_TEXTURE});
          background-size: cover;
          transform: rotateY(180deg);
        }
        .sol-card-corner {
          font-size: 0.95rem;
          font-weight: 700;
          line-height: 1.1;
          text-align: center;
          text-shadow: 0 1px 2px rgba(0, 0, 0, 0.35);
        }
        .sol-card-corner span:first-child {
          display: block;
        }
        .sol-card-corner--bottom {
          transform: rotate(180deg);
        }
        .sol-card-suit {
          font-size: 2.6rem;
          display: flex;
          align-items: center;
          justify-content: center;
          text-shadow: 0 8px 16px rgba(0, 0, 0, 0.45);
        }
        .sol-card-shuffle .sol-card-inner {
          animation: sol-shuffle 0.8s ease-in-out;
        }
        .sol-slot {
          width: 4.5rem;
          height: 6.5rem;
          border-radius: 0.65rem;
          border: 2px dashed rgba(148, 210, 255, 0.4);
          background: rgba(8, 16, 24, 0.42);
          box-shadow: inset 0 0 16px rgba(0, 0, 0, 0.5);
        }
        .sol-drop-target {
          box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.6), 0 0 18px rgba(37, 99, 235, 0.55);
          border-radius: 0.85rem;
        }
        .sol-drop-target-active {
          box-shadow: 0 0 0 2px rgba(250, 204, 21, 0.85),
            0 0 22px rgba(250, 204, 21, 0.75);
        }
        .sol-invalid {
          animation: sol-shake 0.35s;
        }
        .sol-confetti {
          position: absolute;
          top: -4%;
          width: 0.45rem;
          height: 1.4rem;
          opacity: 0;
          border-radius: 0.25rem;
          animation: sol-confetti-fall 1.8s linear infinite;
          z-index: 45;
        }
        .sol-victory-overlay {
          position: absolute;
          inset: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          background: rgba(2, 10, 18, 0.78);
          backdrop-filter: blur(10px);
          z-index: 40;
        }
        .sol-victory-card {
          padding: 2rem 2.5rem;
          border-radius: 1.25rem;
          background: linear-gradient(140deg, rgba(18, 52, 86, 0.95), rgba(4, 20, 36, 0.95));
          box-shadow: 0 28px 60px rgba(0, 0, 0, 0.55);
          text-align: center;
          max-width: 20rem;
          border: 1px solid rgba(255, 255, 255, 0.08);
        }
        @keyframes sol-shuffle {
          0% {
            transform: rotateY(0deg) translate3d(0, 0, 0);
          }
          30% {
            transform: rotateY(-12deg) translate3d(-4px, -6px, 12px);
          }
          60% {
            transform: rotateY(8deg) translate3d(3px, -10px, -8px);
          }
          100% {
            transform: rotateY(0deg) translate3d(0, 0, 0);
          }
        }
        @keyframes sol-confetti-fall {
          0% {
            opacity: 0;
            transform: translate3d(0, -10vh, 0) rotateZ(0deg);
          }
          10% {
            opacity: 1;
          }
          100% {
            opacity: 0;
            transform: translate3d(0, 90vh, 0) rotateZ(360deg);
          }
        }
        @keyframes sol-shake {
          0% {
            transform: translate3d(0, 0, 0);
          }
          25% {
            transform: translate3d(-4px, 0, 0);
          }
          50% {
            transform: translate3d(4px, 0, 0);
          }
          75% {
            transform: translate3d(-2px, 0, 0);
          }
          100% {
            transform: translate3d(0, 0, 0);
          }
        }
      `}</style>
    </div>
  );
};

export default Solitaire;
