import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import GameLayout from './GameLayout';
import {
  createDeck,
  PATTERN_THEMES,
  fisherYatesShuffle,
  createSeededRng,
  generateSeed,
} from './memory_utils';

const DEFAULT_TIME = { 2: 30, 4: 60, 6: 120 };
const SETTINGS_KEY_PREFIX = 'game:memory:settings';
const PROGRESS_KEY_PREFIX = 'game:memory:progress';

// Built-in theme assets that can be used by the memory game.
const BUILT_IN_THEMES = {
  icons: [
    '/themes/Yaru/apps/2048.svg',
    '/themes/Yaru/apps/car-racer.svg',
    '/themes/Yaru/apps/checkers.svg',
    '/themes/Yaru/apps/flappy-bird.svg',
    '/themes/Yaru/apps/frogger.svg',
    '/themes/Yaru/apps/memory.svg',
    '/themes/Yaru/apps/nmap-nse.svg',
    '/themes/Yaru/apps/pacman.svg',
    '/themes/Yaru/apps/pong.svg',
    '/themes/Yaru/apps/radare2.svg',
    '/themes/Yaru/apps/reversi.svg',
    '/themes/Yaru/apps/snake.svg',
    '/themes/Yaru/apps/sokoban.svg',
    '/themes/Yaru/apps/tetris.svg',
    '/themes/Yaru/apps/tictactoe.svg',
    '/themes/Yaru/apps/tower-defense.svg',
    '/themes/Yaru/apps/volatility.svg',
    '/themes/Yaru/apps/wireshark.svg',
  ],
};

const VALID_SIZES = [2, 4, 6];
const VALID_TIMER_MODES = ['countup', 'countdown'];
const VALID_DECK_TYPES = ['emoji', 'pattern', 'letters', 'theme'];
const VALID_MOTION_SETTINGS = ['system', 'reduced', 'full'];

let sharedAudioContext;
const getAudioContext = () => {
  if (typeof window === 'undefined') return null;
  if (!sharedAudioContext) {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return null;
    sharedAudioContext = new AudioCtx();
  }
  if (sharedAudioContext?.state === 'suspended') {
    sharedAudioContext.resume().catch(() => null);
  }
  return sharedAudioContext;
};

const getSafeThemeName = (themePacks, candidate) => {
  const themeNames = Object.keys(themePacks || {});
  if (candidate && themeNames.includes(candidate)) return candidate;
  return themeNames[0] || 'icons';
};

const sanitizeSettings = (settings, themePacks) => {
  if (!settings || typeof settings !== 'object') return null;
  const safe = {};
  const size = Number(settings.size);
  safe.size = VALID_SIZES.includes(size) ? size : 4;
  safe.timerMode = VALID_TIMER_MODES.includes(settings.timerMode) ? settings.timerMode : 'countup';
  safe.deckType = VALID_DECK_TYPES.includes(settings.deckType) ? settings.deckType : 'emoji';
  safe.patternTheme = PATTERN_THEMES[settings.patternTheme] ? settings.patternTheme : 'vibrant';
  safe.previewTime = Number.isFinite(settings.previewTime)
    ? Math.min(10, Math.max(0, Math.round(settings.previewTime)))
    : 3;
  safe.sound = typeof settings.sound === 'boolean' ? settings.sound : true;
  safe.motionSetting = VALID_MOTION_SETTINGS.includes(settings.motionSetting)
    ? settings.motionSetting
    : 'system';
  safe.seed = typeof settings.seed === 'string' && settings.seed.trim() ? settings.seed : generateSeed();
  safe.themeName = getSafeThemeName(themePacks, settings.themeName);
  return safe;
};

const loadProgress = (key) => {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
};

const saveProgress = (key, payload) => {
  if (typeof window === 'undefined') return false;
  try {
    window.localStorage.setItem(key, JSON.stringify(payload));
    return true;
  } catch {
    return false;
  }
};

const clearProgress = (key) => {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(key);
  } catch {
    // ignore storage errors
  }
};

const sanitizeProgress = (progress, themePacks) => {
  if (!progress || typeof progress !== 'object' || progress.v !== 1) return null;

  const size = Number(progress?.size);
  if (!VALID_SIZES.includes(size)) return null;

  const timerMode = VALID_TIMER_MODES.includes(progress?.timerMode) ? progress.timerMode : null;
  const deckType = VALID_DECK_TYPES.includes(progress?.deckType) ? progress.deckType : null;
  const motionSetting = VALID_MOTION_SETTINGS.includes(progress?.motionSetting)
    ? progress.motionSetting
    : null;
  if (!timerMode || !deckType || !motionSetting) return null;

  const patternTheme = PATTERN_THEMES[progress?.patternTheme] ? progress.patternTheme : 'vibrant';
  const previewTime = Number.isFinite(progress?.previewTime)
    ? Math.min(10, Math.max(0, Math.round(progress.previewTime)))
    : 3;
  const themeName = getSafeThemeName(themePacks, progress?.themeName);
  if (deckType === 'theme' && themeName !== progress?.themeName) return null;

  if (typeof progress.seed !== 'string' || !progress.seed.trim()) return null;
  if (typeof progress.sound !== 'boolean') return null;

  const total = size * size;
  const cards = Array.isArray(progress.cards) ? progress.cards : null;
  if (!cards || cards.length !== total) return null;
  const safeCards = cards.map((card) => {
    if (!card || typeof card !== 'object') return null;
    if (!Number.isInteger(card.id)) return null;
    if (typeof card.pairId !== 'string' || !card.pairId) return null;
    const hasValue = Object.prototype.hasOwnProperty.call(card, 'value');
    const hasImage = typeof card.image === 'string' && card.image.trim();
    if (!hasValue && !hasImage) return null;
    return { ...card };
  });
  if (safeCards.some((card) => card === null)) return null;

  const sanitizeIndexArray = (input, { maxLength = total, dedupe = false } = {}) => {
    if (!Array.isArray(input)) return [];
    const ints = input.filter((item) => Number.isInteger(item) && item >= 0 && item < total);
    const trimmed = ints.slice(0, maxLength);
    return dedupe ? Array.from(new Set(trimmed)) : trimmed;
  };

  const matched = sanitizeIndexArray(progress.matched, { dedupe: true });
  if (matched.length > total) return null;

  const rawFlipped = Array.isArray(progress.flipped) ? progress.flipped : [];
  let flipped = rawFlipped.length > 2 ? [] : sanitizeIndexArray(rawFlipped, { maxLength: 2 });

  const moves = Number.isFinite(progress.moves) ? Math.max(0, Math.floor(progress.moves)) : 0;
  const time = Number.isFinite(progress.time) ? Math.max(0, Math.floor(progress.time)) : 0;
  const stars = Number.isFinite(progress.stars)
    ? Math.min(3, Math.max(1, Math.floor(progress.stars)))
    : 3;
  const streak = Number.isFinite(progress.streak) ? Math.max(0, Math.floor(progress.streak)) : 0;
  const activeIndex = Number.isInteger(progress.activeIndex)
    ? Math.min(total - 1, Math.max(0, progress.activeIndex))
    : 0;

  return {
    v: 1,
    savedAt: Number.isFinite(progress.savedAt) ? progress.savedAt : Date.now(),
    size,
    timerMode,
    deckType,
    patternTheme,
    previewTime,
    sound: progress.sound,
    motionSetting,
    seed: progress.seed,
    themeName,
    cards: safeCards,
    flipped,
    matched,
    moves,
    time,
    stars,
    streak,
    activeIndex,
    isRunning: Boolean(progress.isRunning),
    userPaused: Boolean(progress.userPaused),
  };
};

const isEditableTarget = (target) => {
  if (!target || !(target instanceof HTMLElement)) return false;
  const tag = target.tagName.toLowerCase();
  return ['input', 'textarea', 'select'].includes(tag) || target.isContentEditable;
};

const getNextAvailableIndex = (startIndex, size, matchedSet, rowStep, colStep) => {
  if (!matchedSet?.size) return startIndex;
  let row = Math.floor(startIndex / size);
  let col = startIndex % size;
  while (matchedSet.has(row * size + col)) {
    const nextRow = row + rowStep;
    const nextCol = col + colStep;
    if (nextRow < 0 || nextRow >= size || nextCol < 0 || nextCol >= size) break;
    row = nextRow;
    col = nextCol;
  }
  return row * size + col;
};

const findFirstAvailableIndex = (size, matchedSet) => {
  const total = size * size;
  for (let i = 0; i < total; i += 1) {
    if (!matchedSet.has(i)) return i;
  }
  return 0;
};

/**
 * Single player memory board. This encapsulates the original memory game
 * logic and is rendered once or twice depending on the selected mode.
 */
const MemoryBoard = ({ player, themePacks, onWin, roundId }) => {
  const [size, setSize] = useState(4);
  const [timerMode, setTimerMode] = useState('countup');
  const [cards, setCards] = useState([]);
  const [flipped, setFlipped] = useState([]);
  const [matched, setMatched] = useState([]);
  const [highlight, setHighlight] = useState([]);
  const [moves, setMoves] = useState(0);
  const [time, setTime] = useState(0);
  const [stars, setStars] = useState(3);
  const [userPaused, setUserPaused] = useState(false);
  const [sound, setSound] = useState(true);
  const [best, setBest] = useState({ moves: null, time: null });
  const [announcement, setAnnouncement] = useState('');
  const [deckType, setDeckType] = useState('emoji');
  const [patternTheme, setPatternTheme] = useState('vibrant');
  const [previewTime, setPreviewTime] = useState(3);
  const [previewing, setPreviewing] = useState(false);
  const [streak, setStreak] = useState(0);
  const [particles, setParticles] = useState([]);
  const [nudge, setNudge] = useState(false);
  const [themeName, setThemeName] = useState(getSafeThemeName(themePacks));
  const [seed, setSeed] = useState(generateSeed);
  const [motionSetting, setMotionSetting] = useState('system');
  const [systemReducedMotion, setSystemReducedMotion] = useState(false);
  const [isResolving, setIsResolving] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [uiLocked, setUiLocked] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);

  const startRef = useRef(0);
  const initialTimeRef = useRef(0);
  const rafRef = useRef();
  const pauseStartedRef = useRef(null);
  const timeoutsRef = useRef([]);
  const displayedTimeRef = useRef(time);

  const bestKey = useMemo(
    () => `game:memory:${player}:${size}:${timerMode}:best`,
    [player, size, timerMode]
  );
  const settingsKey = useMemo(() => `${SETTINGS_KEY_PREFIX}:${player}`, [player]);
  const progressKey = useMemo(() => `${PROGRESS_KEY_PREFIX}:${player}`, [player]);
  const matchedSet = useMemo(() => new Set(matched), [matched]);
  const restoredOnMountRef = useRef(false);
  const didInitialLoadRef = useRef(false);
  const saveDebounceRef = useRef();
  const [lastSavedAt, setLastSavedAt] = useState(null);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => {
      setSystemReducedMotion(mq.matches);
    };
    update();
    mq.addEventListener ? mq.addEventListener('change', update) : mq.addListener(update);
    return () => {
      mq.removeEventListener ? mq.removeEventListener('change', update) : mq.removeListener(update);
    };
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const raw = window.localStorage.getItem(settingsKey);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      const safe = sanitizeSettings(parsed, themePacks);
      if (!safe) return;
      setSize(safe.size);
      setTimerMode(safe.timerMode);
      setDeckType(safe.deckType);
      setPatternTheme(safe.patternTheme);
      setPreviewTime(safe.previewTime);
      setSound(safe.sound);
      setMotionSetting(safe.motionSetting);
      setSeed(safe.seed);
      setThemeName(safe.themeName);
    } catch {
      try {
        window.localStorage.removeItem(settingsKey);
      } catch {
        // ignore storage errors
      }
    }
  }, [settingsKey, themePacks]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const payload = {
      size,
      timerMode,
      deckType,
      patternTheme,
      previewTime,
      sound,
      motionSetting,
      seed,
      themeName: getSafeThemeName(themePacks, themeName),
    };
    try {
      window.localStorage.setItem(settingsKey, JSON.stringify(payload));
    } catch {
      // ignore storage errors
    }
  }, [
    size,
    timerMode,
    deckType,
    patternTheme,
    previewTime,
    sound,
    motionSetting,
    seed,
    themeName,
    themePacks,
    settingsKey,
  ]);

  useEffect(() => {
    const nextTheme = getSafeThemeName(themePacks, themeName);
    if (nextTheme !== themeName) {
      setThemeName(nextTheme);
    }
  }, [themePacks, themeName]);

  const clearAllTimeouts = useCallback(() => {
    timeoutsRef.current.forEach(clearTimeout);
    timeoutsRef.current = [];
  }, []);

  const schedule = useCallback(
    (fn, ms) => {
      const id = setTimeout(fn, ms);
      timeoutsRef.current.push(id);
      return id;
    },
    [timeoutsRef]
  );

  useEffect(() => () => clearAllTimeouts(), [clearAllTimeouts]);

  const effectiveReduce =
    motionSetting === 'reduced' || (motionSetting === 'system' && systemReducedMotion);

  const beep = useCallback(() => {
    if (!sound) return;
    const ctx = getAudioContext();
    if (!ctx) return;
    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      gain.gain.value = 0.05;
      osc.type = 'sine';
      osc.frequency.value = 600;
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.12);
    } catch {
      // ignore audio errors
    }
  }, [sound]);

  const reset = useCallback(() => {
    clearProgress(progressKey);
    setLastSavedAt(null);
    clearAllTimeouts();
    setIsResolving(false);
    setIsRunning(false);
    setParticles([]);
    setNudge(false);
    setUiLocked(false);
    let deck;
    const themeAssets = themePacks[themeName] || [];
    const rng = createSeededRng(`memory:${seed}:${size}:${deckType}:${themeName}:${patternTheme}`);
    if (deckType === 'theme' && themeAssets.length) {
      const pairs = (size * size) / 2;
      const themed = themeAssets.map((src, i) => ({
        value: i + 1,
        image: src,
        pairId: `${themeName}:${i}`,
      }));
      const selected = fisherYatesShuffle(themed, rng).slice(0, pairs);
      const doubled = [...selected, ...selected].map((card, index) => ({ id: index, ...card }));
      deck = fisherYatesShuffle(doubled, rng);
    } else {
      deck = createDeck(size, deckType, patternTheme, seed);
    }
    setCards(deck);
    const all = Array.from({ length: size * size }, (_, i) => i);
    if (previewTime > 0) {
      setFlipped(all);
      setPreviewing(true);
      schedule(() => {
        setFlipped([]);
        setPreviewing(false);
      }, previewTime * 1000);
    } else {
      setFlipped([]);
      setPreviewing(false);
    }
    setMatched([]);
    setHighlight([]);
    setMoves(0);
    const initial = timerMode === 'countdown' ? DEFAULT_TIME[size] || 60 : 0;
    setTime(initial);
    displayedTimeRef.current = initial;
    initialTimeRef.current = initial;
    setStars(3);
    setUserPaused(false);
    setIsRunning(false);
    startRef.current = 0;
    pauseStartedRef.current = null;
    setAnnouncement('');
    setStreak(0);
    setActiveIndex(0);
  }, [
    size,
    deckType,
    timerMode,
    patternTheme,
    previewTime,
    themePacks,
    themeName,
    clearAllTimeouts,
    progressKey,
    seed,
    schedule,
  ]);

  useEffect(() => {
    if (didInitialLoadRef.current) return;
    didInitialLoadRef.current = true;

    const rawProgress = loadProgress(progressKey);
    if (!rawProgress) return;
    const safe = sanitizeProgress(rawProgress, themePacks);
    if (!safe) {
      clearProgress(progressKey);
      return;
    }

    restoredOnMountRef.current = true;
    setSize(safe.size);
    setTimerMode(safe.timerMode);
    setDeckType(safe.deckType);
    setPatternTheme(safe.patternTheme);
    setPreviewTime(safe.previewTime);
    setSound(safe.sound);
    setMotionSetting(safe.motionSetting);
    setSeed(safe.seed);
    setThemeName(safe.themeName);

    setCards(safe.cards);
    setFlipped(safe.flipped);
    setMatched(safe.matched);
    setMoves(safe.moves);
    setTime(safe.time);
    setStars(safe.stars);
    setStreak(safe.streak);
    setActiveIndex(safe.activeIndex);
    setIsRunning(safe.isRunning);
    setUserPaused(true);

    setPreviewing(false);
    setIsResolving(false);
    setUiLocked(false);
    setHighlight([]);
    setParticles([]);
    setNudge(false);
    pauseStartedRef.current = null;

    displayedTimeRef.current = safe.time;
    initialTimeRef.current = safe.timerMode === 'countdown' ? DEFAULT_TIME[safe.size] || 60 : 0;
    if (safe.isRunning) {
      const elapsedSoFar =
        safe.timerMode === 'countup' ? safe.time : initialTimeRef.current - safe.time;
      startRef.current = performance.now() - Math.max(0, elapsedSoFar) * 1000;
    } else {
      startRef.current = 0;
    }

    setLastSavedAt(safe.savedAt);
  }, [progressKey, themePacks]);

  useEffect(() => {
    if (!didInitialLoadRef.current) return;
    if (restoredOnMountRef.current) {
      restoredOnMountRef.current = false;
      return;
    }
    reset();
  }, [reset, roundId]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const raw = window.localStorage.getItem(bestKey);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (typeof parsed === 'object' && parsed !== null) setBest(parsed);
      } else {
        setBest({ moves: null, time: null });
      }
    } catch {
      try {
        window.localStorage.removeItem(bestKey);
      } catch {
        // ignore storage errors
      }
    }
  }, [bestKey]);

  const saveBest = useCallback(() => {
    if (typeof window === 'undefined') return;
    try {
      let stored = {};
      const raw = window.localStorage.getItem(bestKey);
      if (raw) {
        try {
          stored = JSON.parse(raw) || {};
        } catch {
          window.localStorage.removeItem(bestKey);
        }
      }
      const elapsed = timerMode === 'countdown' ? initialTimeRef.current - time : time;
      const bestMoves = stored.moves != null ? Math.min(stored.moves, moves) : moves;
      const bestTime = stored.time != null ? Math.min(stored.time, elapsed) : elapsed;
      const updated = { moves: bestMoves, time: bestTime };
      const serialized = JSON.stringify(updated);
      window.localStorage.setItem(bestKey, serialized);
      setBest(updated);
    } catch {
      // ignore storage errors
    }
  }, [moves, time, bestKey, timerMode]);

  const timeUp = timerMode === 'countdown' && time <= 0;

  useEffect(() => {
    if (!cards.length) return;
    if (matched.length === cards.length) {
      clearProgress(progressKey);
      setLastSavedAt(null);
      setIsRunning(false);
      saveBest();
      const elapsed = timerMode === 'countdown' ? initialTimeRef.current - time : time;
      setAnnouncement(`You won in ${moves} moves and ${elapsed} seconds`);
      onWin?.(player, { moves, time: elapsed });
    }
  }, [matched, cards.length, progressKey, saveBest, moves, time, timerMode, onWin, player]);

  useEffect(() => {
    const pairs = cards.length / 2 || 1;
    if (moves <= pairs * 2) setStars(3);
    else if (moves <= pairs * 3) setStars(2);
    else setStars(1);
  }, [moves, cards.length]);

  useEffect(() => {
    if (!cards.length) return;
    setActiveIndex((prev) => {
      const total = size * size;
      const fallback = Math.min(prev, total - 1);
      return matchedSet.has(fallback) ? findFirstAvailableIndex(size, matchedSet) : fallback;
    });
  }, [cards.length, size, matchedSet]);

  useEffect(() => {
    if (timeUp) {
      clearProgress(progressKey);
      setLastSavedAt(null);
      setAnnouncement("Time's up");
      setIsRunning(false);
    }
  }, [timeUp, progressKey]);

  useEffect(() => {
    if (saveDebounceRef.current) {
      clearTimeout(saveDebounceRef.current);
      saveDebounceRef.current = null;
    }
    if (!cards.length || previewing || isResolving || timeUp || matched.length === cards.length) {
      return undefined;
    }
    const payload = {
      v: 1,
      savedAt: Date.now(),
      size,
      timerMode,
      deckType,
      patternTheme,
      previewTime,
      sound,
      motionSetting,
      seed,
      themeName: getSafeThemeName(themePacks, themeName),
      cards,
      flipped,
      matched,
      moves,
      time,
      stars,
      streak,
      activeIndex,
      isRunning,
      userPaused,
    };
    saveDebounceRef.current = setTimeout(() => {
      if (saveProgress(progressKey, payload)) {
        setLastSavedAt(payload.savedAt);
      }
    }, 350);
    return () => {
      if (saveDebounceRef.current) {
        clearTimeout(saveDebounceRef.current);
        saveDebounceRef.current = null;
      }
    };
  }, [
    progressKey,
    cards,
    flipped,
    matched,
    moves,
    time,
    stars,
    streak,
    activeIndex,
    isRunning,
    userPaused,
    previewing,
    isResolving,
    timeUp,
    size,
    timerMode,
    deckType,
    patternTheme,
    previewTime,
    sound,
    motionSetting,
    seed,
    themeName,
    themePacks,
  ]);

  const triggerStreakEffect = useCallback(() => {
    if (effectiveReduce) return;
    setParticles(
      Array.from({ length: 8 }).map((_, i) => ({
        id: i,
        x: Math.random() * 100,
        y: Math.random() * 100,
      }))
    );
    setNudge(true);
    setUiLocked(true);
    schedule(() => setParticles([]), 300);
    schedule(() => setNudge(false), 150);
    schedule(() => setUiLocked(false), 150);
  }, [effectiveReduce, schedule]);

  const isInputDisabled =
    userPaused || previewing || isResolving || uiLocked || timeUp || matched.length === cards.length;

  const handleCardClick = useCallback(
    (idx) => {
      if (isInputDisabled || flipped.includes(idx) || matchedSet.has(idx)) return;
      beep();
      if (!isRunning) {
        const elapsedSoFar = timerMode === 'countdown' ? initialTimeRef.current - time : time;
        startRef.current = performance.now() - elapsedSoFar * 1000;
        setIsRunning(true);
      }
      if (flipped.length === 0) {
        setFlipped([idx]);
        setActiveIndex(idx);
      } else if (flipped.length === 1) {
        const first = flipped[0];
        const second = idx;
        if (first === second) return;
        const newFlipped = [first, second];
        setFlipped(newFlipped);
        setIsResolving(true);
        setMoves((mv) => mv + 1);
        const matchClearMs = effectiveReduce ? 0 : 400;
        const mismatchClearMs = effectiveReduce ? 0 : 800;
        if (cards[first].pairId === cards[second].pairId) {
          setMatched((prev) => [...prev, first, second]);
          setHighlight([first, second]);
          setAnnouncement('Match found');
          setStreak((s) => {
            const n = s + 1;
            if (n > 1) triggerStreakEffect();
            return n;
          });
          schedule(() => {
            setFlipped([]);
            setHighlight([]);
            setIsResolving(false);
          }, matchClearMs);
        } else {
          setAnnouncement('No match');
          setStreak(0);
          schedule(() => {
            setFlipped([]);
            setIsResolving(false);
          }, mismatchClearMs);
        }
      }
    },
    [
      isInputDisabled,
      flipped,
      matchedSet,
      beep,
      isRunning,
      timerMode,
      time,
      effectiveReduce,
      cards,
      schedule,
      triggerStreakEffect,
    ]
  );

  useEffect(() => {
    if (!isRunning) return undefined;
    const loop = (timestamp) => {
      if (!userPaused) {
        const elapsed = Math.floor((timestamp - startRef.current) / 1000);
        const nextTime =
          timerMode === 'countdown'
            ? Math.max(initialTimeRef.current - elapsed, 0)
            : elapsed;
        if (nextTime !== displayedTimeRef.current) {
          displayedTimeRef.current = nextTime;
          setTime(nextTime);
        }
      }
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafRef.current);
  }, [isRunning, userPaused, timerMode]);

  useEffect(() => {
    if (!isRunning) return;
    if (userPaused) {
      pauseStartedRef.current = performance.now();
    } else if (pauseStartedRef.current != null) {
      const pausedDuration = performance.now() - pauseStartedRef.current;
      startRef.current += pausedDuration;
      pauseStartedRef.current = null;
    }
  }, [userPaused, isRunning]);

  const handleBoardKeyDown = useCallback(
    (event) => {
      if (isEditableTarget(event.target)) return;
      const total = size * size;
      if (!total) return;
      const row = Math.floor(activeIndex / size);
      const col = activeIndex % size;

      switch (event.key) {
        case 'ArrowUp': {
          event.preventDefault();
          const nextRow = Math.max(0, row - 1);
          const nextIndex = nextRow * size + col;
          setActiveIndex(getNextAvailableIndex(nextIndex, size, matchedSet, -1, 0));
          break;
        }
        case 'ArrowDown': {
          event.preventDefault();
          const nextRow = Math.min(size - 1, row + 1);
          const nextIndex = nextRow * size + col;
          setActiveIndex(getNextAvailableIndex(nextIndex, size, matchedSet, 1, 0));
          break;
        }
        case 'ArrowLeft': {
          event.preventDefault();
          const nextCol = Math.max(0, col - 1);
          const nextIndex = row * size + nextCol;
          setActiveIndex(getNextAvailableIndex(nextIndex, size, matchedSet, 0, -1));
          break;
        }
        case 'ArrowRight': {
          event.preventDefault();
          const nextCol = Math.min(size - 1, col + 1);
          const nextIndex = row * size + nextCol;
          setActiveIndex(getNextAvailableIndex(nextIndex, size, matchedSet, 0, 1));
          break;
        }
        case 'Enter':
        case ' ': {
          event.preventDefault();
          handleCardClick(activeIndex);
          break;
        }
        case 'p':
        case 'P':
        case 'Escape': {
          event.preventDefault();
          if (!timeUp) setUserPaused((prev) => !prev);
          break;
        }
        case 'r':
        case 'R': {
          event.preventDefault();
          reset();
          break;
        }
        default:
          break;
      }
    },
    [activeIndex, size, matchedSet, handleCardClick, timeUp, reset]
  );

  const boardLabel = `Player ${player} memory board`;
  const boardMaxWidth = size * 96;

  return (
    <div className="h-full w-full flex flex-col items-center justify-center bg-ub-cool-grey text-white p-4 select-none">
      <div aria-live="polite" role="status" className="sr-only">
        {announcement}
      </div>
      <div
        className="relative mb-4 w-full"
        style={{
          maxWidth: `${boardMaxWidth}px`,
          transform: nudge ? 'translateX(2px)' : 'none',
          transition: effectiveReduce ? 'none' : 'transform 150ms',
        }}
        role="grid"
        aria-label={boardLabel}
        tabIndex={0}
        onKeyDown={handleBoardKeyDown}
      >
        <div className="grid gap-2 sm:gap-3 lg:gap-4" style={{ gridTemplateColumns: `repeat(${size}, minmax(0,1fr))` }}>
          {cards.map((card, i) => {
            const isFlipped = flipped.includes(i) || matchedSet.has(i);
            const isHighlighted = highlight.includes(i);
            const row = Math.floor(i / size) + 1;
            const col = (i % size) + 1;
            const cardValueLabel = card.image ? 'theme icon' : `${card.value}`;
            const stateLabel = matchedSet.has(i)
              ? `matched ${cardValueLabel}`
              : isFlipped
              ? `revealed ${cardValueLabel}`
              : 'face down';
            return (
              <button
                key={card.id}
                type="button"
                onClick={() => handleCardClick(i)}
                onFocus={() => setActiveIndex(i)}
                aria-label={`Row ${row}, Column ${col}, ${stateLabel}`}
                aria-pressed={isFlipped}
                disabled={isInputDisabled || flipped.includes(i) || matchedSet.has(i)}
                tabIndex={activeIndex === i ? 0 : -1}
                className={`relative w-full aspect-square [perspective:600px] rounded focus:outline-none focus:ring-2 focus:ring-green-400 focus:ring-offset-2 focus:ring-offset-ub-cool-grey ${
                  isHighlighted ? 'ring-4 ring-green-600' : ''
                }`}
                style={{
                  transform: isHighlighted && !effectiveReduce ? 'scale(1.05)' : 'scale(1)',
                  transition: effectiveReduce ? 'none' : 'transform 200ms',
                }}
              >
                <div
                  data-testid="card-inner"
                  className="w-full h-full [transform-style:preserve-3d]"
                  style={{
                    transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
                    transitionProperty: 'transform',
                    transitionDuration: effectiveReduce ? '0ms' : '500ms',
                  }}
                >
                  <div className="absolute inset-0 rounded flex items-center justify-center bg-gray-700 text-white [backface-visibility:hidden]" />
                  <div
                    className={`absolute inset-0 rounded flex items-center justify-center [transform:rotateY(180deg)] [backface-visibility:hidden] ${
                      isHighlighted ? 'bg-green-500 text-black' : 'bg-white text-black'
                    }`}
                    style={{
                      transition: effectiveReduce ? 'none' : 'background-color 300ms, color 300ms',
                    }}
                  >
                    {card.image ? (
                      <img src={card.image} alt="" className="w-3/4 h-3/4 object-contain" />
                    ) : (
                      <span className={`text-4xl ${card.color || ''}`}>{card.value}</span>
                    )}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
        {particles.map((p) => (
          <span
            key={p.id}
            className="pointer-events-none absolute w-2 h-2 bg-yellow-400 rounded-full animate-ping"
            style={{ left: `${p.x}%`, top: `${p.y}%` }}
          />
        ))}
        {timeUp && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/60 text-white text-2xl">
            Time&apos;s up
          </div>
        )}
        {userPaused && !timeUp && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/60 text-white text-2xl">
            Paused
          </div>
        )}
      </div>
      <div className="flex flex-wrap justify-center gap-4 mb-3 text-sm">
        <div>Time: {time}s</div>
        <div>Moves: {moves}</div>
        <div>
          Rating: {'★'.repeat(stars)}{'☆'.repeat(3 - stars)}
        </div>
        {best.moves != null && <div>Best: {best.moves}m/{best.time}s</div>}
        <div data-testid="combo-meter">Combo: {streak}</div>
      </div>
      <div className="flex flex-wrap items-center justify-center gap-2">
        <button
          type="button"
          onClick={reset}
          className="px-2 py-1 bg-gray-700 hover:bg-gray-600 rounded focus:outline-none focus:ring-2 focus:ring-green-400"
        >
          Reset
        </button>
        <button
          type="button"
          onClick={() => {
            clearProgress(progressKey);
            setLastSavedAt(null);
            reset();
          }}
          className="px-2 py-1 bg-gray-700 hover:bg-gray-600 rounded focus:outline-none focus:ring-2 focus:ring-green-400"
        >
          Clear Save
        </button>
        <button
          type="button"
          onClick={() => setUserPaused((p) => !p)}
          className="px-2 py-1 bg-gray-700 hover:bg-gray-600 rounded focus:outline-none focus:ring-2 focus:ring-green-400"
          disabled={timeUp}
        >
          {userPaused ? 'Resume' : 'Pause'}
        </button>
        <button
          type="button"
          onClick={() => setSound((s) => !s)}
          className="px-2 py-1 bg-gray-700 hover:bg-gray-600 rounded focus:outline-none focus:ring-2 focus:ring-green-400"
        >
          Sound: {sound ? 'On' : 'Off'}
        </button>
        <div className="flex items-center space-x-1">
          <span className="text-sm">Motion</span>
          <select
            aria-label="Motion preference"
            value={motionSetting}
            onChange={(e) => setMotionSetting(e.target.value)}
            className="px-2 py-1 bg-gray-700 hover:bg-gray-600 rounded text-white focus:outline-none focus:ring-2 focus:ring-green-400"
          >
            <option value="system">System</option>
            <option value="reduced">Reduced</option>
            <option value="full">Full</option>
          </select>
        </div>
        <div className="flex items-center space-x-1">
          <label htmlFor={`seed-${player}`} className="text-sm">
            Seed
          </label>
          <input
            id={`seed-${player}`}
            value={seed}
            onChange={(e) => setSeed(e.target.value)}
            className="px-2 py-1 bg-gray-700 rounded text-white w-24 focus:outline-none focus:ring-2 focus:ring-green-400"
          />
          <button
            type="button"
            onClick={() => setSeed(generateSeed())}
            className="px-2 py-1 bg-gray-700 hover:bg-gray-600 rounded focus:outline-none focus:ring-2 focus:ring-green-400"
          >
            New seed
          </button>
        </div>
        <select
          aria-label="Deck"
          value={deckType}
          onChange={(e) => setDeckType(e.target.value)}
          className="px-2 py-1 bg-gray-700 hover:bg-gray-600 rounded text-white focus:outline-none focus:ring-2 focus:ring-green-400"
        >
          <option value="emoji">Emoji</option>
          <option value="pattern">Pattern</option>
          <option value="letters">Letters</option>
          <option value="theme">Theme</option>
        </select>
        {deckType === 'pattern' && (
          <select
            aria-label="Pattern theme"
            value={patternTheme}
            onChange={(e) => setPatternTheme(e.target.value)}
            className="px-2 py-1 bg-gray-700 hover:bg-gray-600 rounded text-white focus:outline-none focus:ring-2 focus:ring-green-400"
          >
            {Object.keys(PATTERN_THEMES).map((t) => (
              <option key={t} value={t}>
                {t[0].toUpperCase() + t.slice(1)}
              </option>
            ))}
          </select>
        )}
        {deckType === 'theme' && (
          <select
            aria-label="Theme pack"
            value={themeName}
            onChange={(e) => setThemeName(e.target.value)}
            className="px-2 py-1 bg-gray-700 hover:bg-gray-600 rounded text-white focus:outline-none focus:ring-2 focus:ring-green-400"
          >
            {Object.keys(themePacks).map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        )}
        <select
          aria-label="Timer mode"
          value={timerMode}
          onChange={(e) => setTimerMode(e.target.value)}
          className="px-2 py-1 bg-gray-700 hover:bg-gray-600 rounded text-white focus:outline-none focus:ring-2 focus:ring-green-400"
        >
          <option value="countup">Count Up</option>
          <option value="countdown">Countdown</option>
        </select>
        <select
          aria-label="Grid size"
          value={size}
          onChange={(e) => setSize(Number(e.target.value))}
          className="px-2 py-1 bg-gray-700 hover:bg-gray-600 rounded text-white focus:outline-none focus:ring-2 focus:ring-green-400"
        >
          <option value={2}>2x2</option>
          <option value={4}>4x4</option>
          <option value={6}>6x6</option>
        </select>
        <div className="flex items-center space-x-1">
          <label htmlFor={`preview-time-${player}`} className="text-sm">
            Preview {previewTime}s
          </label>
          <input
            id={`preview-time-${player}`}
            type="range"
            min="0"
            max="10"
            step="1"
            value={previewTime}
            onChange={(e) => setPreviewTime(Number(e.target.value))}
            className="w-24"
          />
        </div>
        {lastSavedAt && <span className="text-xs text-gray-300">Autosaved</span>}
      </div>
    </div>
  );
};

const decideWinner = (results) => {
  if (!results?.length) return null;
  const sorted = [...results].sort((a, b) => {
    if (a.moves !== b.moves) return a.moves - b.moves;
    return a.time - b.time;
  });
  const [best, second] = sorted;
  if (!second) return { winner: best.player, tie: false };
  if (best.moves === second.moves && best.time === second.time) {
    return { winner: null, tie: true };
  }
  return { winner: best.player, tie: false };
};

// Wrapper component which can render one or two MemoryBoard instances
// and also allows downloading additional theme packs.
const Memory = () => {
  const [playerCount, setPlayerCount] = useState(1);
  const [themePacks, setThemePacks] = useState(BUILT_IN_THEMES);
  const [results, setResults] = useState([]);
  const [roundId, setRoundId] = useState(0);
  const [downloadStatus, setDownloadStatus] = useState(null);

  const handleDownloadTheme = async () => {
    if (typeof window === 'undefined') return;
    const url = window.prompt('Enter theme pack URL');
    if (!url) return;
    try {
      const parsedUrl = new URL(url);
      if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
        throw new Error('Invalid URL');
      }
      const res = await fetch(parsedUrl.toString());
      if (!res.ok) {
        throw new Error('Fetch failed');
      }
      const data = await res.json();
      const name = typeof data?.name === 'string' ? data.name.trim() : '';
      const assets = Array.isArray(data?.assets)
        ? data.assets.filter((asset) => typeof asset === 'string' && asset.trim())
        : [];
      if (!name || assets.length === 0) {
        throw new Error('Invalid payload');
      }
      setThemePacks((prev) => ({ ...prev, [name]: assets }));
      setDownloadStatus({ type: 'success', message: `Theme "${name}" added.` });
    } catch {
      setDownloadStatus({
        type: 'error',
        message: 'Theme download failed. Check the URL and payload format.',
      });
    }
  };

  useEffect(() => {
    if (!downloadStatus) return undefined;
    const timer = setTimeout(() => setDownloadStatus(null), 4000);
    return () => clearTimeout(timer);
  }, [downloadStatus]);

  const handleWin = useCallback((player, payload) => {
    setResults((prev) => {
      const updated = prev.filter((entry) => entry.player !== player);
      return [...updated, { player, ...payload }];
    });
  }, []);

  useEffect(() => {
    setResults([]);
  }, [playerCount, roundId]);

  const outcome = useMemo(() => {
    if (results.length < playerCount) return null;
    return decideWinner(results);
  }, [results, playerCount]);

  const handleNewRound = () => {
    setResults([]);
    setRoundId((prev) => prev + 1);
  };

  return (
    <GameLayout gameId="memory">
      <div className="h-full w-full flex flex-col items-center justify-start bg-ub-cool-grey text-white p-4 select-none">
        <div className="mb-4 flex flex-wrap gap-2 items-center justify-center">
          <button
            type="button"
            onClick={() => setPlayerCount((c) => (c === 1 ? 2 : 1))}
            className="px-2 py-1 bg-gray-700 hover:bg-gray-600 rounded focus:outline-none focus:ring-2 focus:ring-green-400"
          >
            {playerCount === 1 ? 'Two Players' : 'One Player'}
          </button>
          <button
            type="button"
            onClick={handleNewRound}
            className="px-2 py-1 bg-gray-700 hover:bg-gray-600 rounded focus:outline-none focus:ring-2 focus:ring-green-400"
          >
            New Round
          </button>
          <button
            type="button"
            onClick={handleDownloadTheme}
            className="px-2 py-1 bg-gray-700 hover:bg-gray-600 rounded focus:outline-none focus:ring-2 focus:ring-green-400"
          >
            Download Theme Pack
          </button>
          {downloadStatus && (
            <span
              className={`text-sm ${
                downloadStatus.type === 'success' ? 'text-green-300' : 'text-red-300'
              }`}
            >
              {downloadStatus.message}
            </span>
          )}
        </div>
        <div className="mb-4 text-sm text-center">
          <p>Keyboard: arrows to move, Enter/Space to flip, P/Escape to pause, R to reset.</p>
          {playerCount === 2 && (
            <p className="text-gray-300">
              Two-player tie-break: fewest moves wins, then fastest time. Complete both boards to
              declare a winner.
            </p>
          )}
        </div>
        {playerCount === 2 && outcome && (
          <div className="mb-4 text-base">
            {outcome.tie ? 'Result: Tie game.' : `Winner: Player ${outcome.winner}`}
          </div>
        )}
        <div
          className={`flex w-full gap-6 ${
            playerCount === 2 ? 'flex-col xl:flex-row items-center xl:items-start' : 'justify-center'
          }`}
        >
          {Array.from({ length: playerCount }, (_, i) => (
            <MemoryBoard
              key={`${roundId}-${i}`}
              player={i + 1}
              themePacks={themePacks}
              onWin={handleWin}
              roundId={roundId}
            />
          ))}
        </div>
      </div>
    </GameLayout>
  );
};

export default Memory;
