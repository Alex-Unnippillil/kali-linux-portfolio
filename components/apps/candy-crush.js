
import React, {
  Fragment,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { AnimatePresence, LayoutGroup, motion } from 'framer-motion';
import { Overlay, useGameLoop } from './Games/common';
import {
  BOARD_WIDTH,
  GEM_IDS,
  createPlayableBoard,
  detonateColorBomb,
  findFirstPossibleMove,
  findMatches,
  hasPossibleMoves,
  initialBoosters,
  isAdjacent,
  removeCandyAt,
  resolveBoard,
  scoreCascade,
  shuffleBoard,
  swapCandies,
  useCandyCrushStats,
} from './candy-crush-logic';
import usePersistentState from '../../hooks/usePersistentState';
import { getAudioContext } from '../../utils/audio';

const cellSize = 50;
const gridGap = 6;
const MOVES_PER_LEVEL = 24;

const computeTargetScore = (level) => 850 + (level - 1) * 360;

const isBoolean = (value) => typeof value === 'boolean';

const GEM_LIBRARY = {
  aurora: {
    label: 'Aurora Berry',
    base: '#38bdf8',
    mid: '#2563eb',
    glow: '#bae6fd',
    shadow: '#0f172a',
    highlight: '#f8fafc',
    accent: '#22d3ee',
    symbol: '◆',
    pattern: '#1e3a8a',
  },
  solstice: {
    label: 'Citrus Slice',
    base: '#f97316',
    mid: '#ea580c',
    glow: '#fed7aa',
    shadow: '#7c2d12',
    highlight: '#fff7ed',
    accent: '#fb923c',
    symbol: '⬢',
    pattern: '#7c2d12',
  },
  abyss: {
    label: 'Blueberry Drop',
    base: '#6366f1',
    mid: '#4338ca',
    glow: '#c7d2fe',
    shadow: '#1e1b4b',
    highlight: '#eef2ff',
    accent: '#818cf8',
    symbol: '⬣',
    pattern: '#312e81',
  },
  ion: {
    label: 'Mint Spark',
    base: '#22d3ee',
    mid: '#0ea5e9',
    glow: '#a5f3fc',
    shadow: '#083344',
    highlight: '#ecfeff',
    accent: '#67e8f9',
    symbol: '⬡',
    pattern: '#134e4a',
  },
  pulse: {
    label: 'Cherry Bloom',
    base: '#f472b6',
    mid: '#ec4899',
    glow: '#fbcfe8',
    shadow: '#831843',
    highlight: '#fdf2f8',
    accent: '#f9a8d4',
    symbol: '✶',
    pattern: '#701a75',
  },
};

const fallbackGem = {
  label: 'Unknown Candy',
  base: '#94a3b8',
  mid: '#64748b',
  glow: '#cbd5f5',
  shadow: '#0f172a',
  highlight: '#f8fafc',
  accent: '#e2e8f0',
  symbol: '?',
  pattern: '#475569',
};

const useGem = (id) => GEM_LIBRARY[id] ?? fallbackGem;

const GemSprite = ({ cell, gem, streak, colorblindMode }) => {
  const gradientId = useMemo(() => `gem-gradient-${cell.id}`, [cell.id]);
  const glowId = useMemo(() => `gem-glow-${cell.id}`, [cell.id]);
  const patternId = useMemo(() => `gem-pattern-${cell.id}`, [cell.id]);
  const shimmerDelay = useMemo(() => (parseInt(cell.id.replace(/\D/g, ''), 10) % 5) * 0.15, [cell.id]);
  const shimmerStrength = streak >= 3 ? 1 : 0;

  return (
    <motion.svg
      viewBox="0 0 100 100"
      width="100%"
      height="100%"
      aria-hidden
      initial={{ scale: 0.85, opacity: 0 }}
      animate={{
        scale: 1,
        opacity: 1,
        filter: [
          'drop-shadow(0px 0px 0px rgba(255,255,255,0.25))',
          `drop-shadow(0px 0px ${6 + shimmerStrength * 6}px ${gem.glow}66)`,
        ],
      }}
      transition={{ duration: 0.35, ease: 'easeOut' }}
      className="overflow-visible"
    >
      <defs>
        <radialGradient id={gradientId} cx="30%" cy="30%" r="80%">
          <stop offset="0%" stopColor={gem.highlight} />
          <stop offset="35%" stopColor={gem.base} />
          <stop offset="75%" stopColor={gem.mid} />
          <stop offset="100%" stopColor={gem.shadow} />
        </radialGradient>
        <linearGradient id={glowId} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor={`${gem.accent}aa`} />
          <stop offset="100%" stopColor={`${gem.highlight}55`} />
        </linearGradient>
        {colorblindMode && (
          <pattern
            id={patternId}
            width="6"
            height="6"
            patternUnits="userSpaceOnUse"
            patternTransform="rotate(45)"
          >
            <rect x="0" y="0" width="6" height="6" fill="transparent" />
            <rect x="0" y="0" width="3" height="6" fill={gem.pattern} opacity="0.4" />
          </pattern>
        )}
      </defs>
      <motion.polygon
        points="50,6 92,32 92,68 50,94 8,68 8,32"
        fill={`url(#${gradientId})`}
        stroke={gem.glow}
        strokeWidth="2"
        animate={{
          rotate: [0, shimmerStrength ? 0.8 : 0, 0],
        }}
        transition={{ duration: 2.8, repeat: Infinity, ease: 'easeInOut', delay: shimmerDelay }}
      />
      <motion.polygon
        points="50,16 82,36 82,64 50,84 18,64 18,36"
        fill={`url(#${glowId})`}
        opacity={0.65}
        animate={{ opacity: [0.35, 0.75, 0.35] }}
        transition={{ duration: 3.2, repeat: Infinity, ease: 'easeInOut', delay: shimmerDelay / 2 }}
      />
      {colorblindMode && (
        <polygon points="50,6 92,32 92,68 50,94 8,68 8,32" fill={`url(#${patternId})`} opacity="0.65" />
      )}
      <motion.circle
        cx="34"
        cy="30"
        r="14"
        fill={gem.highlight}
        opacity={0.5}
        animate={{
          opacity: [0.25, 0.65, 0.25],
          x: [-4, 0, -4],
          y: [-4, 0, -4],
        }}
        transition={{ duration: 3.6, repeat: Infinity, ease: 'easeInOut', delay: shimmerDelay }}
      />
      <motion.text
        x="50"
        y="58"
        fill={colorblindMode ? gem.highlight : `${gem.highlight}cc`}
        fontSize="26"
        fontWeight="700"
        textAnchor="middle"
        dominantBaseline="middle"
        animate={{ opacity: [0.4, 0.8, 0.4] }}
        transition={{ duration: 4.2, repeat: Infinity, ease: 'easeInOut', delay: shimmerDelay }}
      >
        {gem.symbol}
      </motion.text>
    </motion.svg>
  );
};

const CandyCrush = () => {
  const rngRef = useRef(() => Math.random());
  const [board, setBoard] = useState(() => createPlayableBoard(BOARD_WIDTH, GEM_IDS, rngRef.current));
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [moves, setMoves] = useState(0);
  const [movesLeft, setMovesLeft] = useState(MOVES_PER_LEVEL);
  const [level, setLevel] = useState(1);
  const [targetScore, setTargetScore] = useState(() => computeTargetScore(1));
  const [message, setMessage] = useState('Match three candies to start a sweet cascade.');
  const [selected, setSelected] = useState(null);
  const [boosters, setBoosters] = useState(() => ({ ...initialBoosters }));
  const [paused, setPaused] = useState(false);
  const [lastCascade, setLastCascade] = useState(null);
  const [comboBanner, setComboBanner] = useState(null);
  const [particleBursts, setParticleBursts] = useState([]);
  const [levelComplete, setLevelComplete] = useState(false);
  const [levelFailed, setLevelFailed] = useState(false);
  const [showEndScreen, setShowEndScreen] = useState(false);
  const [colorblindMode, setColorblindMode] = usePersistentState(
    'candy-crush:colorblind',
    false,
    isBoolean,
  );
  const dragSource = useRef(null);
  const cascadeSource = useRef('auto');
  const started = useRef(false);
  const burstTimers = useRef([]);
  const gridCellRefs = useRef([]);
  const hintTimeout = useRef(null);
  const { bestScore, bestStreak, updateStats } = useCandyCrushStats();
  const [muted, setMuted] = usePersistentState('candy-crush:muted', false, isBoolean);
  const [activeIndex, setActiveIndex] = useState(0);
  const [hintMove, setHintMove] = useState(null);
  const [activeBooster, setActiveBooster] = useState(null);

  const playTone = useCallback(
    (frequency, duration = 0.35) => {
      if (muted || typeof window === 'undefined') return;
      try {
        const ctx = getAudioContext();
        const now = ctx.currentTime;
        const oscillator = ctx.createOscillator();
        const gain = ctx.createGain();
        oscillator.type = 'triangle';
        oscillator.frequency.setValueAtTime(frequency, now);
        oscillator.connect(gain);
        gain.connect(ctx.destination);
        gain.gain.setValueAtTime(0.0001, now);
        gain.gain.exponentialRampToValueAtTime(0.22, now + 0.01);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
        oscillator.start(now);
        oscillator.stop(now + duration + 0.05);
      } catch (error) {
        // Ignore AudioContext errors in environments without audio support.
      }
    },
    [muted],
  );

  const playMatchSound = useCallback(() => playTone(760, 0.3), [playTone]);
  const playFailSound = useCallback(() => playTone(220, 0.25), [playTone]);

  const queueBurst = useCallback((burst) => {
    setParticleBursts((prev) => [...prev, burst]);
    if (typeof window !== 'undefined') {
      const timer = window.setTimeout(() => {
        setParticleBursts((prev) => prev.filter((item) => item.id !== burst.id));
        burstTimers.current = burstTimers.current.filter((value) => value !== timer);
      }, 900);
      burstTimers.current.push(timer);
    }
  }, []);

  useEffect(
    () => () => {
      if (typeof window === 'undefined') return;
      burstTimers.current.forEach((timer) => window.clearTimeout(timer));
      burstTimers.current = [];
    },
    [],
  );

  useEffect(
    () => () => {
      if (typeof window === 'undefined') return;
      if (hintTimeout.current) {
        window.clearTimeout(hintTimeout.current);
        hintTimeout.current = null;
      }
    },
    [],
  );

  const stats = useMemo(
    () => [
      { label: 'Level', value: level },
      { label: 'Score', value: score },
      { label: 'Goal', value: targetScore },
      { label: 'Moves Used', value: moves },
      { label: 'Moves Left', value: Math.max(movesLeft, 0) },
      { label: 'Combo', value: streak },
      { label: 'Best Score', value: bestScore },
      { label: 'Best Combo', value: bestStreak },
    ],
    [bestScore, bestStreak, level, moves, movesLeft, score, streak, targetScore],
  );

  useEffect(() => {
    updateStats(score, streak);
  }, [score, streak, updateStats]);

  useEffect(() => {
    const target = gridCellRefs.current[activeIndex];
    if (target && target !== document.activeElement) {
      target.focus();
    }
  }, [activeIndex]);

  useEffect(() => {
    if (!comboBanner) return;
    const timer = setTimeout(() => setComboBanner(null), 1600);
    return () => clearTimeout(timer);
  }, [comboBanner]);

  useEffect(() => {
    if ((levelComplete && showEndScreen) || levelFailed) return;
    if (score >= targetScore && started.current) {
      setLevelComplete(true);
      setShowEndScreen(true);
      setPaused(true);
      setMessage('Objective complete! Sugar rush unlocked.');
    }
  }, [score, targetScore, levelComplete, showEndScreen, levelFailed]);

  useEffect(() => {
    if (movesLeft > 0 || levelComplete || levelFailed) return;
    if (score < targetScore) {
      setLevelFailed(true);
      setShowEndScreen(true);
      setPaused(true);
      setMessage('Out of moves. Try a booster or replay the level.');
    }
  }, [movesLeft, levelComplete, levelFailed, score, targetScore]);

  const step = useCallback(() => {
    let cascadeDetails = null;
    setBoard((current) => {
      const result = resolveBoard(current, BOARD_WIDTH, GEM_IDS, rngRef.current);
      if (result.cascades.length === 0) {
        return current;
      }
      const totalPoints = result.cascades.reduce(
        (total, cascade, index) => total + scoreCascade(cascade, index + 1),
        0,
      );
      const uniquePositions = Array.from(
        new Set(result.cascades.flatMap((cascade) => cascade.matches.flat())),
      );
      cascadeDetails = {
        totalPoints,
        cleared: result.cleared,
        chain: result.cascades.length,
        positions: uniquePositions,
        colors: uniquePositions.map((index) => current[index]?.gem ?? GEM_IDS[0]),
        triggeredByPlayer: cascadeSource.current === 'player',
      };
      return result.board;
    });

    if (!cascadeDetails) {
      return;
    }

    const { chain, cleared, totalPoints, positions, colors, triggeredByPlayer } = cascadeDetails;

    const shouldAnnounce = triggeredByPlayer || started.current;

    if (totalPoints > 0 && shouldAnnounce) {
      setScore((prev) => prev + totalPoints);
      setLastCascade({ chain, cleared, points: totalPoints, positions });
      setMessage(
        chain > 1
          ? `Chain x${chain}! Cleared ${cleared} candies (+${totalPoints}).`
          : `Cleared ${cleared} candies (+${totalPoints}).`,
      );
      setComboBanner({ id: `${Date.now()}-${chain}`, chain, points: totalPoints });
      queueBurst({ id: `${Date.now()}-${Math.random()}`, positions, colors });
      playMatchSound();
    }

    if (triggeredByPlayer && totalPoints > 0) {
      setStreak((prev) => prev + 1);
    }

    cascadeSource.current = 'auto';
  }, [playMatchSound, queueBurst]);

  useGameLoop(step, !paused);

  const isInteractionDisabled = paused || levelComplete || levelFailed || showEndScreen;

  const clearHint = useCallback(() => {
    if (typeof window !== 'undefined' && hintTimeout.current) {
      window.clearTimeout(hintTimeout.current);
      hintTimeout.current = null;
    }
    setHintMove(null);
  }, []);

  const regenerateBoard = useCallback(
    (nextMessage) => {
      setBoard(createPlayableBoard(BOARD_WIDTH, GEM_IDS, rngRef.current));
      setSelected(null);
      setActiveIndex(0);
      setActiveBooster(null);
      clearHint();
      setLastCascade(null);
      setComboBanner(null);
      setParticleBursts([]);
      setMessage(nextMessage);
    },
    [clearHint],
  );

  const attemptSwap = useCallback(
    (from, to) => {
      if (isInteractionDisabled) return;
      if (!isAdjacent(from, to, BOARD_WIDTH)) {
        setSelected(to);
        setMessage('Choose an adjacent candy to swap.');
        return;
      }

      let matched = false;
      let shouldBuzz = false;

      setBoard((current) => {
        const next = swapCandies(current, from, to);
        const matches = findMatches(next, BOARD_WIDTH);
        if (matches.length === 0) {
          shouldBuzz = true;
          return current;
        }
        matched = true;
        cascadeSource.current = 'player';
        return next;
      });

      setSelected(null);

      if (!matched) {
        setStreak(0);
        setMessage('No match. Streak reset.');
        if (shouldBuzz) playFailSound();
        return;
      }

      started.current = true;
      setMoves((prev) => prev + 1);
      setMovesLeft((prev) => Math.max(0, prev - 1));
      setMessage('Sweet match! Cascade incoming.');
    },
    [isInteractionDisabled, playFailSound],
  );

  const handleCellClick = useCallback(
    (index) => {
      if (isInteractionDisabled) return;
      clearHint();
      if (activeBooster === 'lollipop') {
        handleLollipop(index);
        return;
      }
      if (selected === null) {
        setSelected(index);
        setMessage('Select an adjacent candy to swap.');
        return;
      }
      if (selected === index) {
        setSelected(null);
        return;
      }
      attemptSwap(selected, index);
    },
    [activeBooster, attemptSwap, clearHint, handleLollipop, isInteractionDisabled, selected],
  );

  const handleDragStart = useCallback(
    (index, event) => {
      if (isInteractionDisabled || activeBooster) return;
      dragSource.current = index;
      setActiveIndex(index);
      clearHint();
      setSelected(index);
      if (event?.dataTransfer) {
        event.dataTransfer.effectAllowed = 'move';
      }
    },
    [activeBooster, clearHint, isInteractionDisabled],
  );

  const handleDrop = useCallback(
    (index) => {
      if (isInteractionDisabled) return;
      if (dragSource.current === null) return;
      attemptSwap(dragSource.current, index);
      dragSource.current = null;
    },
    [attemptSwap, isInteractionDisabled],
  );

  const handleDragEnd = useCallback(() => {
    dragSource.current = null;
    setSelected(null);
  }, []);

  const handleShuffle = useCallback(() => {
    if (isInteractionDisabled) return;
    setActiveBooster(null);
    let allowed = false;
    setBoosters((prev) => {
      if (prev.shuffle === 0) return prev;
      allowed = true;
      return { ...prev, shuffle: prev.shuffle - 1 };
    });
    if (!allowed) {
      setMessage('No shuffle boosters remaining.');
      return;
    }
    started.current = true;
    cascadeSource.current = 'player';
    setBoard((current) => shuffleBoard(current, rngRef.current));
    setMoves((prev) => prev + 1);
    setMovesLeft((prev) => Math.max(0, prev - 1));
    clearHint();
    setMessage('Board reshuffled. Look for a sweet swap.');
  }, [clearHint, isInteractionDisabled]);

  const handleColorBomb = useCallback(() => {
    if (isInteractionDisabled) return;
    setActiveBooster(null);
    let allowed = false;
    setBoosters((prev) => {
      if (prev.colorBomb === 0) return prev;
      allowed = true;
      return { ...prev, colorBomb: prev.colorBomb - 1 };
    });
    if (!allowed) {
      setMessage('No color bombs available.');
      return;
    }

    let removed = 0;
    let cascadePositions = [];
    let detonatedColor = null;
    setBoard((current) => {
      const result = detonateColorBomb(current, BOARD_WIDTH, GEM_IDS, rngRef.current);
      removed = result.removed;
      detonatedColor = result.color;
      if (removed > 0) {
        cascadePositions = current
          .map((cell, index) => (cell?.gem === result.color ? index : null))
          .filter((index) => index !== null);
      }
      if (removed > 0) {
        cascadeSource.current = 'player';
        started.current = true;
        return result.board;
      }
      return current;
    });

    if (removed === 0) {
      setMessage('Color bomb fizzled—no candies cleared.');
      return;
    }

    const bonus = removed * 12;
    setScore((prev) => prev + bonus);
    setMoves((prev) => prev + 1);
    setMovesLeft((prev) => Math.max(0, prev - 1));
    clearHint();
    setMessage(`Color bomb cleared ${removed} candies (+${bonus}).`);
    setLastCascade({ chain: 1, cleared: removed, points: bonus, positions: cascadePositions });
    queueBurst({
      id: `${Date.now()}-bomb`,
      positions: cascadePositions,
      colors: cascadePositions.map(() => detonatedColor ?? GEM_IDS[0]),
    });
    playMatchSound();
  }, [clearHint, isInteractionDisabled, playMatchSound, queueBurst]);

  const handleLollipop = useCallback(
    (index) => {
      if (isInteractionDisabled) return;
      let allowed = false;
      setBoosters((prev) => {
        if (prev.lollipop === 0) return prev;
        allowed = true;
        return { ...prev, lollipop: prev.lollipop - 1 };
      });
      if (!allowed) {
        setActiveBooster(null);
        setMessage('No lollipop hammers remaining.');
        return;
      }

      let removedColor = null;
      let removedCount = 0;
      setBoard((current) => {
        const result = removeCandyAt(current, index, BOARD_WIDTH, GEM_IDS, rngRef.current);
        removedColor = result.color;
        removedCount = result.removed;
        if (removedCount === 0) return current;
        cascadeSource.current = 'player';
        started.current = true;
        return result.board;
      });

      setActiveBooster(null);
      clearHint();

      if (removedCount === 0) {
        setMessage('That candy cannot be smashed.');
        return;
      }

      setScore((prev) => prev + 20);
      setMoves((prev) => prev + 1);
      setMovesLeft((prev) => Math.max(0, prev - 1));
      setMessage('Lollipop hammer smashed a candy (+20).');
      queueBurst({
        id: `${Date.now()}-lollipop`,
        positions: [index],
        colors: [removedColor ?? GEM_IDS[0]],
      });
      playMatchSound();
    },
    [clearHint, isInteractionDisabled, playMatchSound, queueBurst],
  );

  const resetBoardState = useCallback(
    (nextLevel) => {
      setBoard(createPlayableBoard(BOARD_WIDTH, GEM_IDS, rngRef.current));
      setScore(0);
      setStreak(0);
      setMoves(0);
      setMovesLeft(MOVES_PER_LEVEL);
      setBoosters({ ...initialBoosters });
      setSelected(null);
      setActiveIndex(0);
      setActiveBooster(null);
      clearHint();
      setLastCascade(null);
      setComboBanner(null);
      setParticleBursts([]);
      setPaused(false);
      setShowEndScreen(false);
      setLevelFailed(false);
      setLevelComplete(false);
      cascadeSource.current = 'auto';
      started.current = false;
      setMessage(nextLevel ? 'New objective loaded. Keep the combos rolling!' : 'New board ready. Match three candies!');
    },
    [clearHint],
  );

  const handleReset = useCallback(() => {
    setLevel(1);
    setTargetScore(computeTargetScore(1));
    resetBoardState(false);
  }, [resetBoardState]);

  const handleNextLevel = useCallback(() => {
    setLevel((prev) => {
      const nextLevel = prev + 1;
      setTargetScore(computeTargetScore(nextLevel));
      resetBoardState(true);
      return nextLevel;
    });
  }, [resetBoardState]);

  const handleRetryLevel = useCallback(() => {
    setTargetScore(computeTargetScore(level));
    resetBoardState(false);
  }, [level, resetBoardState]);

  const handlePause = useCallback(() => {
    if (levelComplete || levelFailed) return;
    setPaused(true);
    clearHint();
    setMessage('Game paused.');
  }, [clearHint, levelComplete, levelFailed]);

  const handleResume = useCallback(() => {
    if (showEndScreen) return;
    setPaused(false);
    setMessage('Game resumed.');
  }, [showEndScreen]);

  const handleToggleSound = useCallback(
    (nextMuted) => {
      setMuted(nextMuted);
      setMessage(nextMuted ? 'Sound muted.' : 'Sound on.');
    },
    [setMuted],
  );

  const toggleColorblind = useCallback(() => {
    setColorblindMode((prev) => !prev);
    setMessage(colorblindMode ? 'Standard palette enabled.' : 'Colorblind palette enabled.');
  }, [colorblindMode, setColorblindMode]);

  const handleHint = useCallback(() => {
    if (isInteractionDisabled) return;
    setActiveBooster(null);
    const hint = findFirstPossibleMove(board, BOARD_WIDTH);
    if (!hint) {
      regenerateBoard('No moves detected. Refreshing the candy board.');
      return;
    }
    clearHint();
    setHintMove(hint);
    setActiveIndex(hint[0]);
    setMessage('Hint: swap the highlighted candies to start a cascade.');
    if (typeof window !== 'undefined') {
      hintTimeout.current = window.setTimeout(() => {
        setHintMove(null);
        hintTimeout.current = null;
      }, 1400);
    }
  }, [board, clearHint, isInteractionDisabled, regenerateBoard]);

  const handleGridKeyDown = useCallback(
    (event) => {
      if (event.altKey || event.ctrlKey || event.metaKey) return;
      const key = event.key;
      const size = board.length;
      if (size === 0) return;

      const row = Math.floor(activeIndex / BOARD_WIDTH);
      const col = activeIndex % BOARD_WIDTH;
      let nextIndex = activeIndex;

      if (key === 'ArrowRight') {
        event.preventDefault();
        nextIndex = Math.min(size - 1, row * BOARD_WIDTH + Math.min(BOARD_WIDTH - 1, col + 1));
      } else if (key === 'ArrowLeft') {
        event.preventDefault();
        nextIndex = Math.max(0, row * BOARD_WIDTH + Math.max(0, col - 1));
      } else if (key === 'ArrowUp') {
        event.preventDefault();
        nextIndex = Math.max(0, (row - 1) * BOARD_WIDTH + col);
      } else if (key === 'ArrowDown') {
        event.preventDefault();
        nextIndex = Math.min(size - 1, (row + 1) * BOARD_WIDTH + col);
      } else if (key === 'Enter' || key === ' ') {
        event.preventDefault();
        if (isInteractionDisabled) return;
        clearHint();
        if (activeBooster === 'lollipop') {
          handleLollipop(activeIndex);
          return;
        }
        handleCellClick(activeIndex);
        return;
      } else if (key === 'Escape') {
        event.preventDefault();
        setSelected(null);
        clearHint();
        return;
      } else if (key === 'h' || key === 'H') {
        event.preventDefault();
        handleHint();
        return;
      } else if (key === 'p' || key === 'P') {
        event.preventDefault();
        if (showEndScreen) return;
        paused ? handleResume() : handlePause();
        return;
      } else if (key === 'm' || key === 'M') {
        event.preventDefault();
        handleToggleSound(!muted);
        return;
      } else if (key === 'r' || key === 'R') {
        event.preventDefault();
        handleRetryLevel();
        return;
      }

      if (nextIndex !== activeIndex) {
        setActiveIndex(nextIndex);
      }
    },
    [
      activeIndex,
      activeBooster,
      board.length,
      clearHint,
      handleCellClick,
      handleHint,
      handleLollipop,
      handlePause,
      handleResume,
      handleRetryLevel,
      handleToggleSound,
      isInteractionDisabled,
      muted,
      paused,
      showEndScreen,
    ],
  );

  useEffect(() => {
    if (isInteractionDisabled) return;
    if (!hasPossibleMoves(board, BOARD_WIDTH)) {
      regenerateBoard('No possible moves left. Shuffling to a sweet grid.');
    }
  }, [board, isInteractionDisabled, regenerateBoard]);

  const gridStyle = useMemo(
    () => ({
      gridTemplateColumns: `repeat(${BOARD_WIDTH}, ${cellSize}px)`,
      gridAutoRows: `${cellSize}px`,
    }),
    [],
  );

  const scoreProgress = targetScore > 0 ? Math.min(1, score / targetScore) * 100 : 0;
  const movesProgress = Math.min(1, (MOVES_PER_LEVEL - movesLeft) / MOVES_PER_LEVEL) * 100;

  const statusLabel = levelFailed
    ? 'Level Failed'
    : levelComplete
    ? 'Level Cleared'
    : paused
    ? 'Paused'
    : 'Active';

  const statusTheme = levelFailed
    ? 'border-rose-400/60 bg-rose-400/15 text-rose-100 shadow-[0_0_18px_rgba(251,113,133,0.35)]'
    : levelComplete
    ? 'border-emerald-400/70 bg-emerald-400/15 text-emerald-50 shadow-[0_0_18px_rgba(52,211,153,0.35)]'
    : paused
    ? 'border-amber-400/60 bg-amber-400/15 text-amber-50 shadow-[0_0_18px_rgba(251,191,36,0.35)]'
    : 'border-fuchsia-400/60 bg-fuchsia-400/15 text-fuchsia-50 shadow-[0_0_18px_rgba(217,70,239,0.35)]';

  return (
    <div className="relative flex flex-col gap-6 rounded-[32px] border border-pink-400/20 bg-gradient-to-br from-[#2b0c3a] via-[#1d1035] to-[#0e1023] p-6 text-sm text-pink-50 shadow-[0_0_40px_rgba(236,72,153,0.35)] backdrop-blur-xl sm:text-base">
      <Overlay
        onPause={handlePause}
        onResume={handleResume}
        muted={muted}
        paused={paused}
        onToggleSound={handleToggleSound}
        onReset={handleRetryLevel}
      />
      <div className="flex flex-col gap-6 xl:flex-row xl:items-start">
        <div className="flex w-full flex-col gap-6 xl:max-w-sm">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold uppercase tracking-[0.35em] text-pink-100 sm:text-xl">
                Candy Crush
              </h2>
              <p className="text-xs text-pink-200/70 sm:text-sm">
                Match sparkling candies to keep the sugar rush alive.
              </p>
            </div>
            <span
              className={`inline-flex items-center justify-center rounded-full border px-3 py-1 text-[0.65rem] font-semibold uppercase tracking-[0.3em] transition ${statusTheme}`}
            >
              {statusLabel}
            </span>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {stats.map((item) => (
              <div
                key={item.label}
                className="rounded-2xl border border-pink-300/15 bg-white/5 px-4 py-3 shadow-[0_6px_22px_rgba(236,72,153,0.18)] backdrop-blur"
              >
                <div className="text-[0.65rem] font-semibold uppercase tracking-[0.4em] text-pink-200/70">
                  {item.label}
                </div>
                <div className="mt-2 text-2xl font-semibold tabular-nums text-pink-50">{item.value}</div>
              </div>
            ))}
          </div>
          <div className="rounded-2xl border border-pink-300/15 bg-white/5 px-4 py-4 shadow-[0_8px_28px_rgba(236,72,153,0.2)] backdrop-blur">
            <div className="text-[0.65rem] font-semibold uppercase tracking-[0.35em] text-pink-200/70">Sweet Feed</div>
            <p className="mt-2 text-sm leading-snug text-pink-50" aria-live="polite" aria-atomic="true">
              {message}
            </p>
            {lastCascade && (
              <p className="mt-2 text-xs text-pink-100/80">
                Last chain cleared {lastCascade.cleared} candies for {lastCascade.points} points
                {lastCascade.chain > 1 ? ` (x${lastCascade.chain})` : ''}.
              </p>
            )}
            <div className="mt-4 space-y-3">
              <div>
                <div className="flex items-center justify-between text-[0.6rem] uppercase tracking-[0.3em] text-pink-200/70">
                  <span>Score Progress</span>
                  <span>{Math.round(scoreProgress)}%</span>
                </div>
                <div className="mt-2 h-2 overflow-hidden rounded-full bg-black/30">
                  <motion.div
                    className="h-full rounded-full bg-gradient-to-r from-pink-400 via-fuchsia-400 to-purple-400"
                    animate={{ width: `${scoreProgress}%` }}
                    transition={{ type: 'spring', stiffness: 120, damping: 20 }}
                  />
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between text-[0.6rem] uppercase tracking-[0.3em] text-pink-200/70">
                  <span>Move Usage</span>
                  <span>{Math.round(movesProgress)}%</span>
                </div>
                <div className="mt-2 h-2 overflow-hidden rounded-full bg-black/30">
                  <motion.div
                    className="h-full rounded-full bg-gradient-to-r from-amber-400 via-orange-400 to-rose-400"
                    animate={{ width: `${movesProgress}%` }}
                    transition={{ type: 'spring', stiffness: 120, damping: 20 }}
                  />
                </div>
              </div>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={handleReset}
              className="group relative overflow-hidden rounded-lg border border-pink-300/30 bg-white/5 px-4 py-2 font-semibold text-pink-50 shadow-[0_0_18px_rgba(236,72,153,0.25)] transition hover:border-pink-200/60 hover:text-white hover:shadow-[0_0_24px_rgba(236,72,153,0.35)] focus:outline-none focus-visible:ring-2 focus-visible:ring-pink-200 focus-visible:ring-offset-2 focus-visible:ring-offset-[#1b102d]"
            >
              Reset Grid
            </button>
            <button
              type="button"
              onClick={handleHint}
              disabled={isInteractionDisabled}
              className="group relative overflow-hidden rounded-lg border border-amber-300/60 bg-gradient-to-r from-amber-500/80 via-yellow-400/80 to-amber-300/80 px-4 py-2 font-semibold text-amber-50 shadow-[0_0_20px_rgba(251,191,36,0.35)] transition hover:from-amber-400/90 hover:to-yellow-300/90 disabled:cursor-not-allowed disabled:opacity-40 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-200 focus-visible:ring-offset-2 focus-visible:ring-offset-[#1b102d]"
            >
              Hint
            </button>
            <div className="group relative">
              <button
                type="button"
                onClick={handleShuffle}
                disabled={boosters.shuffle === 0 || isInteractionDisabled}
                aria-describedby="shuffle-tooltip"
                className="relative overflow-hidden rounded-lg border border-sky-300/50 bg-gradient-to-r from-sky-500/80 via-cyan-400/80 to-sky-400/80 px-4 py-2 font-semibold text-sky-50 shadow-[0_0_24px_rgba(56,189,248,0.35)] transition hover:from-sky-400/90 hover:to-cyan-300/90 disabled:cursor-not-allowed disabled:opacity-40 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-200 focus-visible:ring-offset-2 focus-visible:ring-offset-[#1b102d]"
              >
                Shuffle ({boosters.shuffle})
                <span className="mt-1 block h-1.5 overflow-hidden rounded-full bg-sky-900/60">
                  <span
                    className="block h-full bg-gradient-to-r from-cyan-400 to-sky-300"
                    style={{ width: `${(boosters.shuffle / initialBoosters.shuffle) * 100}%` }}
                  />
                </span>
              </button>
              <div
                id="shuffle-tooltip"
                role="tooltip"
                className="pointer-events-none absolute z-10 mt-2 w-48 rounded-lg border border-cyan-500/40 bg-slate-900/95 px-3 py-2 text-xs text-cyan-100 opacity-0 shadow-[0_0_18px_rgba(8,47,73,0.45)] transition group-hover:opacity-100 group-focus-within:opacity-100"
              >
                Rearranges the grid. Charges are limited per level.
              </div>
            </div>
            <div className="group relative">
              <button
                type="button"
                onClick={handleColorBomb}
                disabled={boosters.colorBomb === 0 || isInteractionDisabled}
                aria-describedby="bomb-tooltip"
                className="relative overflow-hidden rounded-lg border border-fuchsia-300/60 bg-gradient-to-r from-fuchsia-500/80 via-pink-500/80 to-rose-400/80 px-4 py-2 font-semibold text-fuchsia-50 shadow-[0_0_24px_rgba(217,70,239,0.35)] transition hover:from-fuchsia-400/90 hover:to-rose-300/90 disabled:cursor-not-allowed disabled:opacity-40 focus:outline-none focus-visible:ring-2 focus-visible:ring-fuchsia-200 focus-visible:ring-offset-2 focus-visible:ring-offset-[#1b102d]"
              >
                Color Bomb ({boosters.colorBomb})
                <span className="mt-1 block h-1.5 overflow-hidden rounded-full bg-rose-900/60">
                  <span
                    className="block h-full bg-gradient-to-r from-fuchsia-400 to-rose-300"
                    style={{ width: `${(boosters.colorBomb / initialBoosters.colorBomb) * 100}%` }}
                  />
                </span>
              </button>
              <div
                id="bomb-tooltip"
                role="tooltip"
                className="pointer-events-none absolute z-10 mt-2 w-52 rounded-lg border border-fuchsia-500/40 bg-slate-900/95 px-3 py-2 text-xs text-fuchsia-100 opacity-0 shadow-[0_0_22px_rgba(190,24,93,0.45)] transition group-hover:opacity-100 group-focus-within:opacity-100"
              >
                Detonates the most common gem color. Use wisely—charges are scarce.
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                if (isInteractionDisabled) return;
                setSelected(null);
                clearHint();
                setActiveBooster((prev) => (prev === 'lollipop' ? null : 'lollipop'));
                setMessage(
                  activeBooster === 'lollipop'
                    ? 'Lollipop hammer canceled.'
                    : 'Lollipop hammer ready. Smash any candy.',
                );
              }}
              disabled={boosters.lollipop === 0 || isInteractionDisabled}
              aria-pressed={activeBooster === 'lollipop'}
              className={`rounded-lg border px-4 py-2 font-semibold shadow-[0_0_18px_rgba(244,114,182,0.35)] transition disabled:cursor-not-allowed disabled:opacity-40 focus:outline-none focus-visible:ring-2 focus-visible:ring-pink-200 focus-visible:ring-offset-2 focus-visible:ring-offset-[#1b102d] ${
                activeBooster === 'lollipop'
                  ? 'border-pink-200/70 bg-pink-400/30 text-pink-50'
                  : 'border-pink-300/50 bg-white/5 text-pink-100/90 hover:text-pink-50'
              }`}
            >
              Lollipop Hammer ({boosters.lollipop})
            </button>
            <button
              type="button"
              onClick={toggleColorblind}
              aria-pressed={colorblindMode}
              className={`rounded-lg border px-4 py-2 font-semibold shadow-[0_0_18px_rgba(16,185,129,0.35)] transition focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-200 focus-visible:ring-offset-2 focus-visible:ring-offset-[#1b102d] ${
                colorblindMode
                  ? 'border-emerald-300/70 bg-emerald-400/20 text-emerald-50'
                  : 'border-emerald-300/40 bg-white/5 text-emerald-100/80 hover:text-emerald-50'
              }`}
            >
              {colorblindMode ? 'Disable Colorblind Mode' : 'Enable Colorblind Mode'}
            </button>
          </div>
        </div>
        <div className="flex flex-1 flex-col items-center gap-4">
          <div className="relative rounded-3xl border border-pink-300/30 bg-gradient-to-br from-white/10 via-white/5 to-white/10 p-4 shadow-[0_0_45px_rgba(236,72,153,0.35)] backdrop-blur-lg">
            <LayoutGroup>
              <div className="relative">
                <div
                  className="grid gap-2 rounded-2xl bg-gradient-to-br from-pink-500/10 via-purple-500/10 to-blue-500/10 p-3"
                  style={gridStyle}
                  role="grid"
                  aria-label="Candy Crush grid"
                  aria-rowcount={BOARD_WIDTH}
                  aria-colcount={BOARD_WIDTH}
                  aria-describedby="candy-crush-instructions"
                  onKeyDown={handleGridKeyDown}
                >
                  {board.map((cell, index) => {
                    const gem = useGem(cell.gem);
                    const row = Math.floor(index / BOARD_WIDTH) + 1;
                    const col = (index % BOARD_WIDTH) + 1;
                    const isDisabled = isInteractionDisabled;
                    const hinted = Boolean(hintMove && (hintMove[0] === index || hintMove[1] === index));
                    const isActive = activeIndex === index;
                    return (
                      <motion.button
                        ref={(el) => {
                          gridCellRefs.current[index] = el;
                        }}
                        key={cell.id}
                        type="button"
                        layout
                        role="gridcell"
                        aria-selected={selected === index}
                        tabIndex={isActive ? 0 : -1}
                        draggable={!isDisabled && !activeBooster}
                        disabled={isDisabled}
                        onFocus={() => setActiveIndex(index)}
                        onDragStart={(event) => handleDragStart(index, event)}
                        onDragOver={(event) => event.preventDefault()}
                        onDrop={(event) => {
                          event.preventDefault();
                          handleDrop(index);
                        }}
                        onDragEnd={handleDragEnd}
                        onClick={() => {
                          setActiveIndex(index);
                          handleCellClick(index);
                        }}
                        aria-pressed={selected === index}
                        aria-label={`${gem.label} candy at row ${row}, column ${col}`}
                        whileHover={{ scale: isDisabled ? 1 : 1.05 }}
                        whileTap={{ scale: isDisabled ? 1 : 0.92 }}
                        className={`relative flex items-center justify-center overflow-hidden rounded-2xl border border-white/10 bg-white/10 transition duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-pink-200 focus-visible:ring-offset-2 focus-visible:ring-offset-[#1b102d] ${
                          selected === index
                            ? 'ring-2 ring-pink-300 ring-offset-2 ring-offset-[#1b102d]'
                            : hinted
                            ? 'ring-2 ring-amber-300/70 ring-offset-2 ring-offset-[#1b102d]'
                            : isActive
                            ? 'border-pink-200/70'
                            : 'hover:shadow-[0_0_16px_rgba(236,72,153,0.35)]'
                        }`}
                        style={{ width: cellSize, height: cellSize }}
                      >
                        <GemSprite cell={cell} gem={gem} streak={streak} colorblindMode={colorblindMode} />
                      </motion.button>
                    );
                  })}
                </div>
                <AnimatePresence>
                  {comboBanner && (
                    <motion.div
                      key={comboBanner.id}
                      initial={{ opacity: 0, y: -24 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -24 }}
                      transition={{ duration: 0.35, ease: 'easeOut' }}
                      className="pointer-events-none absolute -top-10 left-1/2 -translate-x-1/2 rounded-full border border-cyan-400/60 bg-slate-900/80 px-4 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-cyan-100 shadow-[0_0_18px_rgba(14,165,233,0.35)]"
                    >
                      Combo x{comboBanner.chain}! +{comboBanner.points}
                    </motion.div>
                  )}
                </AnimatePresence>
                <div className="pointer-events-none absolute inset-0">
                  {particleBursts.map((burst) => (
                    <Fragment key={burst.id}>
                      {burst.positions.map((index, particleIndex) => {
                        const row = Math.floor(index / BOARD_WIDTH);
                        const col = index % BOARD_WIDTH;
                        const gem = useGem(burst.colors[particleIndex] ?? GEM_IDS[0]);
                        const left = col * (cellSize + gridGap) + cellSize / 2;
                        const top = row * (cellSize + gridGap) + cellSize / 2;
                        return (
                          <motion.span
                            key={`${burst.id}-${index}`}
                            initial={{ scale: 0, opacity: 0.8 }}
                            animate={{ scale: [0, 1, 0.4], opacity: [0.8, 0.6, 0] }}
                            transition={{ duration: 0.9, ease: 'easeOut', times: [0, 0.4, 1] }}
                            className="absolute h-3 w-3 rounded-full"
                            style={{
                              left,
                              top,
                              transform: 'translate(-50%, -50%)',
                              background: `radial-gradient(circle, ${gem.highlight} 0%, ${gem.accent} 60%, transparent 100%)`,
                              boxShadow: `0 0 12px ${gem.glow}aa`,
                            }}
                          />
                        );
                      })}
                    </Fragment>
                  ))}
                </div>
              </div>
            </LayoutGroup>
          </div>
          <p id="candy-crush-instructions" className="sr-only">
            Use arrow keys to move around the board. Press Enter or Space to select a candy, then press Enter on an adjacent
            candy to swap. Press Escape to clear selection. Press H for a hint, P to pause, M to mute, and R to restart the
            level.
          </p>
          <p className="text-xs text-pink-200/70">
            Drag or click adjacent candies to swap. Keyboard: arrows, Enter, Esc, H hint, P pause, M mute, R restart.
          </p>
        </div>
      </div>
      <AnimatePresence>
        {showEndScreen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="pointer-events-auto absolute inset-0 z-20 flex items-center justify-center rounded-3xl bg-[#1a0f2a]/85 backdrop-blur-xl"
            role="dialog"
            aria-modal="true"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.92, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 160, damping: 18 }}
              className="w-full max-w-md rounded-3xl border border-pink-300/30 bg-gradient-to-br from-[#2f1545] via-[#24123d] to-[#1b102d] p-6 text-center text-pink-50 shadow-[0_0_32px_rgba(236,72,153,0.45)]"
            >
              <h3 className="text-xl font-semibold uppercase tracking-[0.35em] text-pink-100">
                {levelComplete ? 'Level Cleared' : 'Level Failed'}
              </h3>
              <p className="mt-3 text-sm text-pink-100/80">
                {levelComplete
                  ? 'Sugar rush achieved. Ready for the next level?'
                  : 'The candies resisted. Recharge boosters and try again.'}
              </p>
              <div className="mt-6 flex flex-col gap-3">
                {levelComplete ? (
                  <button
                    type="button"
                    onClick={handleNextLevel}
                    className="rounded-xl border border-emerald-300/60 bg-gradient-to-r from-emerald-500/80 via-teal-400/80 to-emerald-300/80 px-4 py-2 font-semibold text-emerald-50 shadow-[0_0_24px_rgba(52,211,153,0.35)] transition hover:from-emerald-400/90 hover:to-teal-300/90 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-200 focus-visible:ring-offset-2 focus-visible:ring-offset-[#1b102d]"
                  >
                    Continue to Level {level + 1}
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleRetryLevel}
                    className="rounded-xl border border-rose-300/60 bg-gradient-to-r from-rose-500/80 via-pink-400/80 to-rose-300/80 px-4 py-2 font-semibold text-rose-50 shadow-[0_0_24px_rgba(251,113,133,0.35)] transition hover:from-rose-400/90 hover:to-pink-300/90 focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-200 focus-visible:ring-offset-2 focus-visible:ring-offset-[#1b102d]"
                  >
                    Retry Level {level}
                  </button>
                )}
                <button
                  type="button"
                  onClick={handleReset}
                  className="rounded-xl border border-pink-300/40 bg-white/5 px-4 py-2 font-semibold text-pink-50 shadow-[0_0_18px_rgba(236,72,153,0.25)] transition hover:border-pink-200/60 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-pink-200 focus-visible:ring-offset-2 focus-visible:ring-offset-[#1b102d]"
                >
                  Return to Level 1
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default CandyCrush;
