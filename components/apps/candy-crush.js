
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
  createBoard,
  detonateColorBomb,
  findMatches,
  initialBoosters,
  isAdjacent,
  resolveBoard,
  scoreCascade,
  shuffleBoard,
  swapCandies,
  useCandyCrushStats,
} from './candy-crush-logic';
import GameLayout, { useGameLayoutState } from './GameLayout';
import usePersistentState from '../../hooks/usePersistentState';
import { useSettings } from '../../hooks/useSettings';
import { getAudioContext } from '../../utils/audio';
import seedrandom from 'seedrandom';

const cellSize = 48;
const gridGap = 8;
const MOVES_PER_LEVEL = 24;

const computeTargetScore = (level) => 750 + (level - 1) * 320;

const isBoolean = (value) => typeof value === 'boolean';
const isNonEmptyString = (value) => typeof value === 'string' && value.trim().length > 0;

const DEFAULT_GEM_TOKENS = {
  aurora: {
    label: 'Aurora Prism',
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
    label: 'Solstice Ember',
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
    label: 'Abyss Crystal',
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
    label: 'Ion Spark',
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
    label: 'Pulse Bloom',
    base: '#f472b6',
    mid: '#ec4899',
    glow: '#fbcfe8',
    shadow: '#831843',
    highlight: '#fdf2f8',
    accent: '#f9a8d4',
    symbol: '✶',
    pattern: '#701a75',
  },
  fallback: {
    label: 'Unknown Gem',
    base: '#94a3b8',
    mid: '#64748b',
    glow: '#cbd5f5',
    shadow: '#0f172a',
    highlight: '#f8fafc',
    accent: '#e2e8f0',
    symbol: '?',
    pattern: '#475569',
  },
};

const GEM_VARIABLES = {
  aurora: {
    base: '--candy-gem-aurora-base',
    mid: '--candy-gem-aurora-mid',
    glow: '--candy-gem-aurora-glow',
    shadow: '--candy-gem-aurora-shadow',
    highlight: '--candy-gem-aurora-highlight',
    accent: '--candy-gem-aurora-accent',
    pattern: '--candy-gem-aurora-pattern',
  },
  solstice: {
    base: '--candy-gem-solstice-base',
    mid: '--candy-gem-solstice-mid',
    glow: '--candy-gem-solstice-glow',
    shadow: '--candy-gem-solstice-shadow',
    highlight: '--candy-gem-solstice-highlight',
    accent: '--candy-gem-solstice-accent',
    pattern: '--candy-gem-solstice-pattern',
  },
  abyss: {
    base: '--candy-gem-abyss-base',
    mid: '--candy-gem-abyss-mid',
    glow: '--candy-gem-abyss-glow',
    shadow: '--candy-gem-abyss-shadow',
    highlight: '--candy-gem-abyss-highlight',
    accent: '--candy-gem-abyss-accent',
    pattern: '--candy-gem-abyss-pattern',
  },
  ion: {
    base: '--candy-gem-ion-base',
    mid: '--candy-gem-ion-mid',
    glow: '--candy-gem-ion-glow',
    shadow: '--candy-gem-ion-shadow',
    highlight: '--candy-gem-ion-highlight',
    accent: '--candy-gem-ion-accent',
    pattern: '--candy-gem-ion-pattern',
  },
  pulse: {
    base: '--candy-gem-pulse-base',
    mid: '--candy-gem-pulse-mid',
    glow: '--candy-gem-pulse-glow',
    shadow: '--candy-gem-pulse-shadow',
    highlight: '--candy-gem-pulse-highlight',
    accent: '--candy-gem-pulse-accent',
    pattern: '--candy-gem-pulse-pattern',
  },
};

const DEFAULT_BOOSTER_TOKENS = {
  shuffle: {
    background: 'linear-gradient(90deg, rgba(12,74,110,0.8) 0%, rgba(8,145,178,0.8) 50%, rgba(2,132,199,0.8) 100%)',
    border: 'rgba(56,189,248,0.4)',
    shadow: '0 0 24px rgba(14,165,233,0.35)',
    track: 'rgba(8,47,73,0.65)',
    meter: 'linear-gradient(90deg, #22d3ee 0%, #38bdf8 100%)',
  },
  colorBomb: {
    background: 'linear-gradient(90deg, rgba(134,25,143,0.82) 0%, rgba(219,39,119,0.82) 50%, rgba(244,63,94,0.82) 100%)',
    border: 'rgba(236,72,153,0.45)',
    shadow: '0 0 24px rgba(217,70,239,0.35)',
    track: 'rgba(76,5,25,0.65)',
    meter: 'linear-gradient(90deg, #f472b6 0%, #fb7185 100%)',
  },
  meterHeight: '0.375rem',
};

const BOOSTER_VARIABLES = {
  shuffle: {
    background: '--candy-booster-shuffle-background',
    border: '--candy-booster-shuffle-border',
    shadow: '--candy-booster-shuffle-shadow',
    track: '--candy-booster-track',
    meter: '--candy-booster-shuffle-meter',
  },
  colorBomb: {
    background: '--candy-booster-bomb-background',
    border: '--candy-booster-bomb-border',
    shadow: '--candy-booster-bomb-shadow',
    track: '--candy-booster-track',
    meter: '--candy-booster-bomb-meter',
  },
  meterHeight: '--candy-booster-meter-height',
};

const DEFAULT_PROGRESS_TOKENS = {
  track: 'rgba(15,23,42,0.82)',
  fill: 'linear-gradient(90deg, #22d3ee 0%, #38bdf8 55%, #6366f1 100%)',
  movesFill: 'linear-gradient(90deg, #f97316 0%, #fb7185 55%, #f472b6 100%)',
  height: '0.5rem',
  transitionDuration: 0.35,
  ease: 'easeOut',
};

const PROGRESS_VARIABLES = {
  track: '--candy-progress-track',
  fill: '--candy-progress-fill',
  movesFill: '--candy-progress-moves-fill',
  height: '--candy-progress-height',
  transition: '--candy-progress-transition-duration',
  ease: '--candy-progress-ease',
};

const DEFAULT_PARTICLE_TOKENS = {
  maxBursts: 6,
};

const PARTICLE_VARIABLES = {
  maxBursts: '--candy-particle-max-bursts',
};

const readCssVar = (styles, name, fallback) => {
  if (!styles) return fallback;
  const value = styles.getPropertyValue(name);
  return value ? value.trim() || fallback : fallback;
};

const parseDurationSeconds = (value, fallback) => {
  if (!value) return fallback;
  const trimmed = value.trim();
  if (trimmed.endsWith('ms')) {
    const numeric = parseFloat(trimmed.replace('ms', ''));
    return Number.isFinite(numeric) ? numeric / 1000 : fallback;
  }
  const numeric = parseFloat(trimmed);
  return Number.isFinite(numeric) ? numeric : fallback;
};

const parseInteger = (value, fallback) => {
  if (!value) return fallback;
  const numeric = Number.parseInt(value, 10);
  return Number.isNaN(numeric) ? fallback : numeric;
};

const useCandyTokens = (scopeRef, deps = []) => {
  const [tokens, setTokens] = useState(() => ({
    gems: DEFAULT_GEM_TOKENS,
    boosters: DEFAULT_BOOSTER_TOKENS,
    progress: DEFAULT_PROGRESS_TOKENS,
    particles: DEFAULT_PARTICLE_TOKENS,
  }));

  const dependencyKey = JSON.stringify(deps);

  useEffect(() => {
    if (typeof window === 'undefined' || !scopeRef.current) return;
    const element = scopeRef.current;
    const styles = window.getComputedStyle(element);

    const gems = GEM_IDS.reduce((acc, id) => {
      const source = DEFAULT_GEM_TOKENS[id] || DEFAULT_GEM_TOKENS.fallback;
      const mapping = GEM_VARIABLES[id];
      acc[id] = {
        ...source,
        base: readCssVar(styles, mapping.base, source.base),
        mid: readCssVar(styles, mapping.mid, source.mid),
        glow: readCssVar(styles, mapping.glow, source.glow),
        shadow: readCssVar(styles, mapping.shadow, source.shadow),
        highlight: readCssVar(styles, mapping.highlight, source.highlight),
        accent: readCssVar(styles, mapping.accent, source.accent),
        pattern: readCssVar(styles, mapping.pattern, source.pattern),
      };
      return acc;
    }, {});

    const boosters = {
      shuffle: {
        ...DEFAULT_BOOSTER_TOKENS.shuffle,
        background: readCssVar(
          styles,
          BOOSTER_VARIABLES.shuffle.background,
          DEFAULT_BOOSTER_TOKENS.shuffle.background,
        ),
        border: readCssVar(
          styles,
          BOOSTER_VARIABLES.shuffle.border,
          DEFAULT_BOOSTER_TOKENS.shuffle.border,
        ),
        shadow: readCssVar(
          styles,
          BOOSTER_VARIABLES.shuffle.shadow,
          DEFAULT_BOOSTER_TOKENS.shuffle.shadow,
        ),
        track: readCssVar(
          styles,
          BOOSTER_VARIABLES.shuffle.track,
          DEFAULT_BOOSTER_TOKENS.shuffle.track,
        ),
        meter: readCssVar(
          styles,
          BOOSTER_VARIABLES.shuffle.meter,
          DEFAULT_BOOSTER_TOKENS.shuffle.meter,
        ),
      },
      colorBomb: {
        ...DEFAULT_BOOSTER_TOKENS.colorBomb,
        background: readCssVar(
          styles,
          BOOSTER_VARIABLES.colorBomb.background,
          DEFAULT_BOOSTER_TOKENS.colorBomb.background,
        ),
        border: readCssVar(
          styles,
          BOOSTER_VARIABLES.colorBomb.border,
          DEFAULT_BOOSTER_TOKENS.colorBomb.border,
        ),
        shadow: readCssVar(
          styles,
          BOOSTER_VARIABLES.colorBomb.shadow,
          DEFAULT_BOOSTER_TOKENS.colorBomb.shadow,
        ),
        track: readCssVar(
          styles,
          BOOSTER_VARIABLES.colorBomb.track,
          DEFAULT_BOOSTER_TOKENS.colorBomb.track,
        ),
        meter: readCssVar(
          styles,
          BOOSTER_VARIABLES.colorBomb.meter,
          DEFAULT_BOOSTER_TOKENS.colorBomb.meter,
        ),
      },
      meterHeight: readCssVar(
        styles,
        BOOSTER_VARIABLES.meterHeight,
        DEFAULT_BOOSTER_TOKENS.meterHeight,
      ),
    };

    const progress = {
      track: readCssVar(styles, PROGRESS_VARIABLES.track, DEFAULT_PROGRESS_TOKENS.track),
      fill: readCssVar(styles, PROGRESS_VARIABLES.fill, DEFAULT_PROGRESS_TOKENS.fill),
      movesFill: readCssVar(styles, PROGRESS_VARIABLES.movesFill, DEFAULT_PROGRESS_TOKENS.movesFill),
      height: readCssVar(styles, PROGRESS_VARIABLES.height, DEFAULT_PROGRESS_TOKENS.height),
      transitionDuration: parseDurationSeconds(
        readCssVar(styles, PROGRESS_VARIABLES.transition, ''),
        DEFAULT_PROGRESS_TOKENS.transitionDuration,
      ),
      ease: readCssVar(styles, PROGRESS_VARIABLES.ease, DEFAULT_PROGRESS_TOKENS.ease),
    };

    const particles = {
      maxBursts: parseInteger(
        readCssVar(styles, PARTICLE_VARIABLES.maxBursts, ''),
        DEFAULT_PARTICLE_TOKENS.maxBursts,
      ),
    };

    setTokens({
      gems: { ...gems, fallback: DEFAULT_GEM_TOKENS.fallback },
      boosters,
      progress,
      particles,
    });
  }, [scopeRef, dependencyKey]);

  return tokens;
};

const createSeededGenerator = (seed) => {
  const generator = seedrandom(seed, { state: true });
  return () => generator();
};

const LayoutStateBridge = ({ onSuspendedChange }) => {
  const { suspended } = useGameLayoutState();
  useEffect(() => {
    onSuspendedChange(suspended);
  }, [suspended, onSuspendedChange]);
  return null;
};

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
  const containerRef = useRef(null);
  const { density, reducedMotion } = useSettings();
  const tokens = useCandyTokens(containerRef, [density, reducedMotion]);
  const gemLibrary = tokens.gems;
  const fallbackGem = gemLibrary.fallback ?? DEFAULT_GEM_TOKENS.fallback;
  const boosterTokens = tokens.boosters;
  const progressTokens = tokens.progress;
  const maxParticleBursts = tokens.particles?.maxBursts ?? DEFAULT_PARTICLE_TOKENS.maxBursts;

  const [useDeterministicSeeds, setUseDeterministicSeeds] = usePersistentState(
    'candy-crush:deterministic',
    false,
    isBoolean,
  );
  const [seedValue, setSeedValue] = usePersistentState('candy-crush:seed', 'playwright', isNonEmptyString);
  const [seedDraft, setSeedDraft] = useState(seedValue);
  const [layoutSuspended, setLayoutSuspended] = useState(false);
  const rngRef = useRef(() => Math.random());

  const refreshRng = useCallback(() => {
    const generator = useDeterministicSeeds ? createSeededGenerator(seedValue) : () => Math.random();
    rngRef.current = generator;
    return generator;
  }, [seedValue, useDeterministicSeeds]);

  const [board, setBoard] = useState(() => {
    const generator = refreshRng();
    return createBoard(BOARD_WIDTH, GEM_IDS, generator);
  });
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [moves, setMoves] = useState(0);
  const [movesLeft, setMovesLeft] = useState(MOVES_PER_LEVEL);
  const [level, setLevel] = useState(1);
  const [targetScore, setTargetScore] = useState(() => computeTargetScore(1));
  const [message, setMessage] = useState('Match three gems to ignite the cascade.');
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
  useEffect(() => {
    setSeedDraft(seedValue);
  }, [seedValue]);
  const dragSource = useRef(null);
  const cascadeSource = useRef('auto');
  const started = useRef(false);
  const burstTimers = useRef([]);
  const { bestScore, bestStreak, updateStats } = useCandyCrushStats();
  const [muted, setMuted] = usePersistentState('candy-crush:muted', false, isBoolean);
  const initialSeedSync = useRef(true);

  useEffect(() => {
    if (initialSeedSync.current) {
      initialSeedSync.current = false;
      refreshRng();
      return;
    }
    setLevel(1);
    setTargetScore(computeTargetScore(1));
    resetBoardState(
      false,
      useDeterministicSeeds
        ? `Deterministic seed applied. Board synchronized to "${seedValue}".`
        : 'Random seeding restored.',
    );
  }, [resetBoardState, refreshRng, seedValue, useDeterministicSeeds]);

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

  const toggleDeterministic = useCallback(() => {
    setUseDeterministicSeeds((prev) => {
      const next = !prev;
      setMessage(next ? 'Deterministic seeding enabled.' : 'Random seeding enabled.');
      return next;
    });
  }, [setMessage, setUseDeterministicSeeds]);

  const applySeed = useCallback(() => {
    const sanitized = seedDraft.trim();
    const nextSeed = sanitized.length > 0 ? sanitized : 'playwright';
    if (nextSeed === seedValue) return;
    setSeedValue(nextSeed);
    setMessage(`Seed set to "${nextSeed}".`);
  }, [seedDraft, seedValue, setMessage, setSeedValue]);

  const randomizeSeed = useCallback(() => {
    const nextSeed = Math.random().toString(36).slice(2, 10);
    setSeedDraft(nextSeed);
    setSeedValue(nextSeed);
    setMessage(`Random seed generated: "${nextSeed}".`);
  }, [setMessage, setSeedDraft, setSeedValue]);

  const handleSeedKeyDown = useCallback(
    (event) => {
      if (event.key === 'Enter') {
        event.preventDefault();
        applySeed();
      }
    },
    [applySeed],
  );

  const queueBurst = useCallback(
    (burst) => {
      if (layoutSuspended || reducedMotion || maxParticleBursts <= 0) return;
      setParticleBursts((prev) => {
        const next = [...prev, burst];
        if (next.length > maxParticleBursts) {
          return next.slice(next.length - maxParticleBursts);
        }
        return next;
      });
      if (typeof window !== 'undefined') {
        const timer = window.setTimeout(() => {
          setParticleBursts((prev) => prev.filter((item) => item.id !== burst.id));
          burstTimers.current = burstTimers.current.filter((value) => value !== timer);
        }, 900);
        burstTimers.current.push(timer);
      }
    },
    [layoutSuspended, maxParticleBursts, reducedMotion],
  );

  useEffect(
    () => () => {
      if (typeof window === 'undefined') return;
      burstTimers.current.forEach((timer) => window.clearTimeout(timer));
      burstTimers.current = [];
    },
    [],
  );

  const stats = useMemo(
    () => [
      { label: 'Level', value: level },
      { label: 'Score', value: score },
      { label: 'Target', value: targetScore },
      { label: 'Moves Used', value: moves },
      { label: 'Moves Left', value: Math.max(movesLeft, 0) },
      { label: 'Streak', value: streak },
      { label: 'Best Score', value: bestScore },
      { label: 'Best Streak', value: bestStreak },
    ],
    [bestScore, bestStreak, level, moves, movesLeft, score, streak, targetScore],
  );

  useEffect(() => {
    updateStats(score, streak);
  }, [score, streak, updateStats]);

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
      setMessage('Objective complete. Celebrate the breach!');
    }
  }, [score, targetScore, levelComplete, showEndScreen, levelFailed]);

  useEffect(() => {
    if (movesLeft > 0 || levelComplete || levelFailed) return;
    if (score < targetScore) {
      setLevelFailed(true);
      setShowEndScreen(true);
      setPaused(true);
      setMessage('Out of moves. Deploy boosters or try again.');
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

    if (totalPoints > 0) {
      setScore((prev) => prev + totalPoints);
      const shouldAnnounce = triggeredByPlayer || started.current;
      if (shouldAnnounce) {
        setLastCascade({ chain, cleared, points: totalPoints, positions });
        setMessage(
          chain > 1
            ? `Chain x${chain}! Cleared ${cleared} gems (+${totalPoints}).`
            : `Cleared ${cleared} gems (+${totalPoints}).`,
        );
        setComboBanner({ id: `${Date.now()}-${chain}`, chain, points: totalPoints });
        queueBurst({ id: `${Date.now()}-${Math.random()}`, positions, colors });
        playMatchSound();
      }
    }

    if (triggeredByPlayer && totalPoints > 0) {
      setStreak((prev) => prev + 1);
    }

    cascadeSource.current = 'auto';
  }, [playMatchSound, queueBurst]);

  useGameLoop(step, !paused && !layoutSuspended);

  const attemptSwap = useCallback(
    (from, to) => {
      if (!isAdjacent(from, to, BOARD_WIDTH)) {
        setSelected(to);
        setMessage('Choose an adjacent gem to swap.');
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
      setMessage('Match found! Cascade incoming.');
    },
    [playFailSound],
  );

  const handleCellClick = useCallback(
    (index) => {
      if (selected === null) {
        setSelected(index);
        setMessage('Select an adjacent gem to swap.');
        return;
      }
      if (selected === index) {
        setSelected(null);
        return;
      }
      attemptSwap(selected, index);
    },
    [attemptSwap, selected],
  );

  const handleDragStart = useCallback(
    (index, event) => {
      dragSource.current = index;
      setSelected(index);
      event.dataTransfer.effectAllowed = 'move';
    },
    [],
  );

  const handleDrop = useCallback(
    (index) => {
      if (dragSource.current === null) return;
      attemptSwap(dragSource.current, index);
      dragSource.current = null;
    },
    [attemptSwap],
  );

  const handleDragEnd = useCallback(() => {
    dragSource.current = null;
    setSelected(null);
  }, []);

  const handleShuffle = useCallback(() => {
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
    setMessage('Grid reconfigured. Seek new breaches.');
  }, []);

  const handleColorBomb = useCallback(() => {
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
      setMessage('Color bomb fizzled—no gems cleared.');
      return;
    }

    const bonus = removed * 12;
    setScore((prev) => prev + bonus);
    setMoves((prev) => prev + 1);
    setMovesLeft((prev) => Math.max(0, prev - 1));
    setMessage(`Color bomb cleared ${removed} gems (+${bonus}).`);
    setLastCascade({ chain: 1, cleared: removed, points: bonus, positions: cascadePositions });
    queueBurst({
      id: `${Date.now()}-bomb`,
      positions: cascadePositions,
      colors: cascadePositions.map(() => detonatedColor ?? GEM_IDS[0]),
    });
    playMatchSound();
  }, [playMatchSound, queueBurst]);

  const resetBoardState = useCallback(
    (nextLevel, announcement) => {
      const generator = refreshRng();
      setBoard(createBoard(BOARD_WIDTH, GEM_IDS, generator));
      setScore(0);
      setStreak(0);
      setMoves(0);
      setMovesLeft(MOVES_PER_LEVEL);
      setBoosters({ ...initialBoosters });
      setSelected(null);
      setLastCascade(null);
      setComboBanner(null);
      setParticleBursts([]);
      setPaused(false);
      setShowEndScreen(false);
      setLevelFailed(false);
      setLevelComplete(false);
      cascadeSource.current = 'auto';
      started.current = false;
      setMessage(
        announcement ??
          (nextLevel
            ? 'New objective loaded. Chain the hacks!'
            : 'New grid ready. Match three gems!'),
      );
    },
    [refreshRng],
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
    setMessage('Game paused.');
  }, [levelComplete, levelFailed]);

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
    ? 'Level Clear'
    : paused
    ? 'Paused'
    : 'Active';

  const statusTheme = levelFailed
    ? 'border-rose-500/50 bg-rose-500/10 text-rose-200 shadow-[0_0_18px_rgba(244,63,94,0.35)]'
    : levelComplete
    ? 'border-emerald-500/60 bg-emerald-500/10 text-emerald-100 shadow-[0_0_18px_rgba(16,185,129,0.35)]'
    : paused
    ? 'border-amber-500/50 bg-amber-500/10 text-amber-100 shadow-[0_0_18px_rgba(251,191,36,0.35)]'
    : 'border-cyan-500/60 bg-cyan-500/10 text-cyan-100 shadow-[0_0_18px_rgba(14,165,233,0.35)]';

  const shuffleCharge = (boosters.shuffle / initialBoosters.shuffle) * 100;
  const colorBombCharge = (boosters.colorBomb / initialBoosters.colorBomb) * 100;
  const boosterMeterHeight = boosterTokens.meterHeight ?? DEFAULT_BOOSTER_TOKENS.meterHeight;
  const shuffleTokens = boosterTokens.shuffle ?? DEFAULT_BOOSTER_TOKENS.shuffle;
  const colorBombTokens = boosterTokens.colorBomb ?? DEFAULT_BOOSTER_TOKENS.colorBomb;

  return (
    <GameLayout gameId="candy-crush" stage={level} score={score} highScore={bestScore}>
      <div
        ref={containerRef}
        data-density={density}
        data-motion={reducedMotion ? 'reduced' : 'normal'}
        className="candy-crush-theme relative flex flex-col gap-6 rounded-3xl border border-cyan-500/10 bg-gradient-to-br from-slate-950 via-slate-950/85 to-slate-900/90 p-6 text-sm text-cyan-100 shadow-[0_0_32px_rgba(8,47,73,0.45)] backdrop-blur-xl sm:text-base"
      >
        <LayoutStateBridge onSuspendedChange={setLayoutSuspended} />
        <Overlay onPause={handlePause} onResume={handleResume} muted={muted} onToggleSound={handleToggleSound} />
        <div className="flex flex-col gap-6 xl:flex-row xl:items-start">
          <div className="flex w-full flex-col gap-6 xl:max-w-sm">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-lg font-semibold uppercase tracking-[0.35em] text-cyan-200 sm:text-xl">Kali Crush</h2>
                <p className="text-xs text-cyan-300/70 sm:text-sm">Match neon gems to keep the breach streak alive.</p>
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
                  className="rounded-2xl border border-cyan-500/15 bg-slate-950/60 px-4 py-3 shadow-[0_6px_22px_rgba(8,145,178,0.18)] backdrop-blur"
                >
                  <div className="text-[0.65rem] font-semibold uppercase tracking-[0.4em] text-cyan-400/80">{item.label}</div>
                  <div className="mt-2 text-2xl font-semibold tabular-nums text-cyan-50">{item.value}</div>
                </div>
              ))}
            </div>
            <div className="rounded-2xl border border-cyan-500/15 bg-slate-950/60 px-4 py-4 shadow-[0_8px_28px_rgba(8,145,178,0.2)] backdrop-blur">
              <div className="text-[0.65rem] font-semibold uppercase tracking-[0.35em] text-cyan-400/80">Mission Feed</div>
              <p className="mt-2 text-sm leading-snug text-cyan-100" aria-live="polite">
                {message}
              </p>
              {lastCascade && (
                <p className="mt-2 text-xs text-cyan-300/80">
                  Last chain cleared {lastCascade.cleared} gems for {lastCascade.points} points
                  {lastCascade.chain > 1 ? ` (x${lastCascade.chain})` : ''}.
                </p>
              )}
              <div className="mt-4 space-y-3">
                <div>
                  <div className="flex items-center justify-between text-[0.6rem] uppercase tracking-[0.3em] text-cyan-400/70">
                    <span>Score Progress</span>
                    <span>{Math.round(scoreProgress)}%</span>
                  </div>
                  <div
                    className="mt-2 overflow-hidden rounded-full"
                    style={{ height: progressTokens.height, background: progressTokens.track }}
                  >
                    <motion.div
                      className="h-full rounded-full"
                      style={{ background: progressTokens.fill }}
                      animate={{ width: `${scoreProgress}%` }}
                      transition={{ duration: progressTokens.transitionDuration, ease: progressTokens.ease }}
                    />
                  </div>
                </div>
                <div>
                  <div className="flex items-center justify-between text-[0.6rem] uppercase tracking-[0.3em] text-cyan-400/70">
                    <span>Move Usage</span>
                    <span>{Math.round(movesProgress)}%</span>
                  </div>
                  <div
                    className="mt-2 overflow-hidden rounded-full"
                    style={{ height: progressTokens.height, background: progressTokens.track }}
                  >
                    <motion.div
                      className="h-full rounded-full"
                      style={{ background: progressTokens.movesFill }}
                      animate={{ width: `${movesProgress}%` }}
                      transition={{ duration: progressTokens.transitionDuration, ease: progressTokens.ease }}
                    />
                  </div>
                </div>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={handleReset}
                className="group relative overflow-hidden rounded-lg border border-cyan-500/30 bg-slate-950/70 px-4 py-2 font-semibold text-cyan-100 shadow-[0_0_18px_rgba(8,47,73,0.45)] transition hover:border-cyan-300/60 hover:text-white hover:shadow-[0_0_24px_rgba(14,165,233,0.3)] focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
              >
                Reset Grid
              </button>
              <div className="group relative">
                <button
                  type="button"
                  onClick={handleShuffle}
                  disabled={boosters.shuffle === 0}
                  aria-describedby="shuffle-tooltip"
                  className="relative overflow-hidden rounded-lg border px-4 py-2 font-semibold text-cyan-50 transition disabled:cursor-not-allowed disabled:opacity-40 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
                  style={{
                    background: shuffleTokens.background,
                    borderColor: shuffleTokens.border,
                    boxShadow: shuffleTokens.shadow,
                  }}
                >
                  Shuffle ({boosters.shuffle})
                  <span
                    className="mt-1 block overflow-hidden rounded-full"
                    style={{ height: boosterMeterHeight, background: shuffleTokens.track }}
                  >
                    <span
                      className="block h-full"
                      style={{ background: shuffleTokens.meter, width: `${shuffleCharge}%` }}
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
                  disabled={boosters.colorBomb === 0}
                  aria-describedby="bomb-tooltip"
                  className="relative overflow-hidden rounded-lg border px-4 py-2 font-semibold text-fuchsia-50 transition disabled:cursor-not-allowed disabled:opacity-40 focus:outline-none focus-visible:ring-2 focus-visible:ring-fuchsia-300 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
                  style={{
                    background: colorBombTokens.background,
                    borderColor: colorBombTokens.border,
                    boxShadow: colorBombTokens.shadow,
                  }}
                >
                  Color Bomb ({boosters.colorBomb})
                  <span
                    className="mt-1 block overflow-hidden rounded-full"
                    style={{ height: boosterMeterHeight, background: colorBombTokens.track }}
                  >
                    <span
                      className="block h-full"
                      style={{ background: colorBombTokens.meter, width: `${colorBombCharge}%` }}
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
                onClick={toggleColorblind}
                aria-pressed={colorblindMode}
                className={`rounded-lg border px-4 py-2 font-semibold shadow-[0_0_18px_rgba(15,118,110,0.35)] transition focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 ${
                  colorblindMode
                    ? 'border-emerald-400/60 bg-emerald-500/20 text-emerald-100'
                    : 'border-emerald-500/40 bg-slate-950/60 text-emerald-100/80 hover:text-emerald-100'
                }`}
              >
                {colorblindMode ? 'Disable Colorblind Mode' : 'Enable Colorblind Mode'}
              </button>
            </div>
            <div className="rounded-2xl border border-cyan-500/15 bg-slate-950/60 px-4 py-4 shadow-[0_8px_28px_rgba(8,145,178,0.2)] backdrop-blur">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h3 className="text-[0.65rem] font-semibold uppercase tracking-[0.35em] text-cyan-400/80">Seed Controls</h3>
                  <p className="mt-1 text-xs text-cyan-300/70">Toggle deterministic boards for reproducible replays.</p>
                </div>
                <button
                  type="button"
                  onClick={toggleDeterministic}
                  className={`rounded-md border px-3 py-1 text-xs font-semibold uppercase tracking-[0.25em] transition focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 ${
                    useDeterministicSeeds
                      ? 'border-cyan-400/70 bg-cyan-500/20 text-cyan-50'
                      : 'border-cyan-500/40 bg-slate-950/60 text-cyan-200 hover:text-cyan-50'
                  }`}
                >
                  {useDeterministicSeeds ? 'Deterministic On' : 'Deterministic Off'}
                </button>
              </div>
              {useDeterministicSeeds && (
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <label
                    htmlFor="candy-seed-input"
                    className="text-[0.6rem] font-semibold uppercase tracking-[0.25em] text-cyan-400/70"
                  >
                    Seed
                  </label>
                  <input
                    id="candy-seed-input"
                    type="text"
                    value={seedDraft}
                    onChange={(event) => setSeedDraft(event.target.value)}
                    onKeyDown={handleSeedKeyDown}
                    aria-label="Deterministic seed"
                    className="min-w-[150px] rounded border border-cyan-500/40 bg-slate-950/60 px-2 py-1 text-sm text-cyan-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
                  />
                  <button
                    type="button"
                    onClick={applySeed}
                    className="rounded-md border border-cyan-500/40 bg-slate-950/60 px-2 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-cyan-200 transition hover:text-cyan-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
                  >
                    Apply
                  </button>
                  <button
                    type="button"
                    onClick={randomizeSeed}
                    className="rounded-md border border-cyan-500/40 bg-slate-950/60 px-2 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-cyan-200 transition hover:text-cyan-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
                  >
                    Randomize
                  </button>
                </div>
              )}
            </div>
          </div>
          <div className="flex flex-1 flex-col items-center gap-4">
            <div className="relative rounded-3xl border border-cyan-500/20 bg-slate-950/60 p-4 shadow-[0_0_40px_rgba(8,145,178,0.35)] backdrop-blur-lg">
              <LayoutGroup>
                <div className="relative">
                  <div className="grid gap-2" style={gridStyle}>
                    {board.map((cell, index) => {
                      const gem = gemLibrary[cell.gem] ?? fallbackGem;
                      const row = Math.floor(index / BOARD_WIDTH) + 1;
                      const col = (index % BOARD_WIDTH) + 1;
                      const isDisabled = levelComplete || levelFailed || showEndScreen;
                      return (
                        <motion.button
                          key={cell.id}
                          type="button"
                          layout
                          draggable={!isDisabled}
                          disabled={isDisabled}
                          onDragStart={(event) => handleDragStart(index, event)}
                          onDragOver={(event) => event.preventDefault()}
                          onDrop={(event) => {
                            event.preventDefault();
                            handleDrop(index);
                          }}
                          onDragEnd={handleDragEnd}
                          onClick={() => handleCellClick(index)}
                          aria-pressed={selected === index}
                          aria-label={`${gem.label} gem at row ${row}, column ${col}`}
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.92 }}
                          className={`relative flex items-center justify-center overflow-hidden rounded-xl border bg-slate-900/60 transition duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 ${
                            selected === index
                              ? 'ring-2 ring-cyan-400 ring-offset-2 ring-offset-slate-950'
                              : 'hover:shadow-[0_0_14px_rgba(56,189,248,0.35)]'
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
                    {!layoutSuspended &&
                      particleBursts.map((burst) => (
                        <Fragment key={burst.id}>
                          {burst.positions.map((index, particleIndex) => {
                            const row = Math.floor(index / BOARD_WIDTH);
                            const col = index % BOARD_WIDTH;
                            const gem = gemLibrary[burst.colors[particleIndex]] ?? fallbackGem;
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
            <p className="text-xs text-cyan-300/70">Drag or click adjacent gems to execute swaps. Boosters refill on reset.</p>
          </div>
        </div>
        <AnimatePresence>
          {showEndScreen && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="pointer-events-auto absolute inset-0 z-20 flex items-center justify-center rounded-3xl bg-slate-950/85 backdrop-blur-xl"
              role="dialog"
              aria-modal="true"
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.92, opacity: 0 }}
                transition={{ type: 'spring', stiffness: 160, damping: 18 }}
                className="w-full max-w-md rounded-3xl border border-cyan-500/30 bg-gradient-to-br from-slate-900 via-slate-900/90 to-slate-950 p-6 text-center text-cyan-100 shadow-[0_0_32px_rgba(8,47,73,0.55)]"
              >
                <h3 className="text-xl font-semibold uppercase tracking-[0.35em] text-cyan-200">
                  {levelComplete ? 'Level Secured' : 'Mission Failed'}
                </h3>
                <p className="mt-3 text-sm text-cyan-200/80">
                  {levelComplete
                    ? 'Your breach streak paid off. Advance to the next objective?'
                    : 'The defense grid held. Recharge boosters and strike again.'}
                </p>
                <div className="mt-6 flex flex-col gap-3">
                  {levelComplete ? (
                    <button
                      type="button"
                      onClick={handleNextLevel}
                      className="rounded-xl border border-emerald-400/50 bg-gradient-to-r from-emerald-600/80 via-teal-500/80 to-emerald-400/80 px-4 py-2 font-semibold text-emerald-50 shadow-[0_0_24px_rgba(16,185,129,0.35)] transition hover:from-emerald-500/90 hover:to-teal-400/90 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
                    >
                      Continue to Level {level + 1}
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={handleRetryLevel}
                      className="rounded-xl border border-rose-400/50 bg-gradient-to-r from-rose-600/80 via-pink-500/80 to-rose-400/80 px-4 py-2 font-semibold text-rose-50 shadow-[0_0_24px_rgba(244,63,94,0.35)] transition hover:from-rose-500/90 hover:to-pink-400/90 focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-300 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
                    >
                      Retry Level {level}
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={handleReset}
                    className="rounded-xl border border-cyan-500/40 bg-slate-950/70 px-4 py-2 font-semibold text-cyan-100 shadow-[0_0_18px_rgba(8,47,73,0.45)] transition hover:border-cyan-300/60 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
                  >
                    Return to Level 1
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      <style jsx global>{`
        .candy-crush-theme {
          --candy-gem-aurora-base: #38bdf8;
          --candy-gem-aurora-mid: #2563eb;
          --candy-gem-aurora-glow: #bae6fd;
          --candy-gem-aurora-shadow: #0f172a;
          --candy-gem-aurora-highlight: #f8fafc;
          --candy-gem-aurora-accent: #22d3ee;
          --candy-gem-aurora-pattern: #1e3a8a;
          --candy-gem-solstice-base: #f97316;
          --candy-gem-solstice-mid: #ea580c;
          --candy-gem-solstice-glow: #fed7aa;
          --candy-gem-solstice-shadow: #7c2d12;
          --candy-gem-solstice-highlight: #fff7ed;
          --candy-gem-solstice-accent: #fb923c;
          --candy-gem-solstice-pattern: #7c2d12;
          --candy-gem-abyss-base: #6366f1;
          --candy-gem-abyss-mid: #4338ca;
          --candy-gem-abyss-glow: #c7d2fe;
          --candy-gem-abyss-shadow: #1e1b4b;
          --candy-gem-abyss-highlight: #eef2ff;
          --candy-gem-abyss-accent: #818cf8;
          --candy-gem-abyss-pattern: #312e81;
          --candy-gem-ion-base: #22d3ee;
          --candy-gem-ion-mid: #0ea5e9;
          --candy-gem-ion-glow: #a5f3fc;
          --candy-gem-ion-shadow: #083344;
          --candy-gem-ion-highlight: #ecfeff;
          --candy-gem-ion-accent: #67e8f9;
          --candy-gem-ion-pattern: #134e4a;
          --candy-gem-pulse-base: #f472b6;
          --candy-gem-pulse-mid: #ec4899;
          --candy-gem-pulse-glow: #fbcfe8;
          --candy-gem-pulse-shadow: #831843;
          --candy-gem-pulse-highlight: #fdf2f8;
          --candy-gem-pulse-accent: #f9a8d4;
          --candy-gem-pulse-pattern: #701a75;
          --candy-progress-track: rgba(15,23,42,0.82);
          --candy-progress-fill: linear-gradient(90deg, #22d3ee 0%, #38bdf8 55%, #6366f1 100%);
          --candy-progress-moves-fill: linear-gradient(90deg, #f97316 0%, #fb7185 55%, #f472b6 100%);
          --candy-progress-height: 0.5rem;
          --candy-progress-transition-duration: 320ms;
          --candy-progress-ease: easeOut;
          --candy-booster-shuffle-background: linear-gradient(90deg, rgba(12,74,110,0.8) 0%, rgba(8,145,178,0.8) 50%, rgba(2,132,199,0.8) 100%);
          --candy-booster-shuffle-border: rgba(56,189,248,0.4);
          --candy-booster-shuffle-shadow: 0 0 24px rgba(14,165,233,0.35);
          --candy-booster-shuffle-meter: linear-gradient(90deg, #22d3ee 0%, #38bdf8 100%);
          --candy-booster-bomb-background: linear-gradient(90deg, rgba(134,25,143,0.82) 0%, rgba(219,39,119,0.82) 50%, rgba(244,63,94,0.82) 100%);
          --candy-booster-bomb-border: rgba(236,72,153,0.45);
          --candy-booster-bomb-shadow: 0 0 24px rgba(217,70,239,0.35);
          --candy-booster-bomb-meter: linear-gradient(90deg, #f472b6 0%, #fb7185 100%);
          --candy-booster-track: rgba(8,47,73,0.65);
          --candy-booster-meter-height: 0.375rem;
          --candy-particle-max-bursts: 6;
        }
        .candy-crush-theme[data-density='compact'] {
          --candy-progress-height: 0.4rem;
          --candy-booster-meter-height: 0.3125rem;
        }
        .candy-crush-theme[data-motion='reduced'] {
          --candy-progress-transition-duration: 0ms;
          --candy-particle-max-bursts: 0;
        }
      `}</style>
    </GameLayout>
  );
};

export default CandyCrush;
