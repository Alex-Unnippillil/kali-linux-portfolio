import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import usePersistentState from '../../hooks/usePersistentState';
import usePrefersReducedMotion from '../../hooks/usePrefersReducedMotion';
import {
  logEvent,
  logGameStart,
  logGameEnd,
  logGameError,
} from '../../utils/analytics';
import { consumeGameKey, shouldHandleGameKey } from '../../utils/gameInput';
import { DICTIONARIES } from '../../apps/hangman/engine';
import { getGuessPool } from '../../apps/games/hangman/logic';
import {
  applyGuess,
  applyHint,
  buildDictionaries,
  createEmptyState,
  DIFFICULTY_PRESETS,
  getMaskedWord,
  getRemainingLetters,
  isLose,
  isWin,
  newGame,
  sanitizeWordList,
} from '../../apps/hangman/model';
import { createHangmanRenderer } from '../../apps/hangman/renderer';

const safeClipboardWriteText = async (text) => {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // ignore
  }
  return false;
};

const getUtcDateKey = () => new Date().toISOString().slice(0, 10);

const buildDailySeed = (category, difficulty) =>
  `daily:${getUtcDateKey()}:${category}:${difficulty}`;

const isStringArray = (value) =>
  Array.isArray(value) && value.every((item) => typeof item === 'string');

const isDifficulty = (value) =>
  typeof value === 'string' && Object.keys(DIFFICULTY_PRESETS).includes(value);

const launchConfetti = (pieces = 90) => {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;
  const confettiContainer = document.createElement('div');
  confettiContainer.style.position = 'fixed';
  confettiContainer.style.top = '0';
  confettiContainer.style.left = '0';
  confettiContainer.style.width = '100%';
  confettiContainer.style.height = '100%';
  confettiContainer.style.pointerEvents = 'none';
  confettiContainer.style.overflow = 'hidden';
  confettiContainer.style.zIndex = '9999';
  document.body.appendChild(confettiContainer);

  const colors = ['#60a5fa', '#34d399', '#fbbf24', '#f472b6'];
  const duration = 2800;
  const maxDelay = 200;
  const piecesWithDelay = [];

  for (let i = 0; i < pieces; i += 1) {
    const confetto = document.createElement('div');
    const size = 4 + Math.random() * 4;
    const delay = Math.random() * maxDelay;
    confetto.style.position = 'absolute';
    confetto.style.width = `${size}px`;
    confetto.style.height = `${size}px`;
    confetto.style.backgroundColor = colors[i % colors.length];
    confetto.style.top = '0px';
    confetto.style.left = `${Math.random() * 100}%`;
    confetto.style.opacity = '1';
    confetto.style.borderRadius = '2px';
    confetto.style.transform = 'translate3d(0, 0, 0) rotate(0deg)';
    confetto.style.transition = `transform ${duration}ms ease-out, opacity ${duration}ms ease-out`;
    confetto.style.transitionDelay = `${delay}ms`;
    confettiContainer.appendChild(confetto);
    piecesWithDelay.push(confetto);
  }

  requestAnimationFrame(() => {
    piecesWithDelay.forEach((element) => {
      const drift = (Math.random() - 0.5) * window.innerWidth * 0.45;
      const rotation = Math.random() * 720;
      element.style.transform = `translate3d(${drift}px, ${window.innerHeight + 90}px, 0) rotate(${rotation}deg)`;
      element.style.opacity = '0';
    });
  });

  setTimeout(() => {
    confettiContainer.remove();
  }, duration + maxDelay + 200);
};

const Hangman = ({ windowMeta } = {}) => {
  const isFocused = windowMeta?.isFocused ?? true;
  const prefersReducedMotion = usePrefersReducedMotion();
  const canvasRef = useRef(null);
  const canvasWrapRef = useRef(null);
  const audioCtxRef = useRef(null);
  const reduceMotionRef = useRef(false);
  const endKeyRef = useRef('');
  const didInitDraftRef = useRef(false);

  const [difficulty, setDifficulty] = usePersistentState(
    'hangman-difficulty',
    'standard',
    isDifficulty,
  );
  const [customWords, setCustomWords] = usePersistentState(
    'hangman-custom-words',
    [],
    isStringArray,
  );
  const dictionaries = useMemo(
    () => buildDictionaries(customWords, DICTIONARIES),
    [customWords],
  );
  const topics = useMemo(() => Object.keys(dictionaries || {}), [dictionaries]);

  const [dict, setDict] = usePersistentState(
    'hangman-dict',
    topics[0] || 'family',
    (v) => typeof v === 'string',
  );
  const [game, setGame] = useState(() => createEmptyState(difficulty));
  const [paused, setPaused] = useState(false);
  const [announcement, setAnnouncement] = useState('');
  const [error, setError] = useState('');
  const [seed, setSeed] = useState(null);
  const [showHelp, setShowHelp] = useState(false);
  const [showOptions, setShowOptions] = useState(false);
  const [customDraft, setCustomDraft] = useState('');
  const [customStatus, setCustomStatus] = useState('');
  const [sound, setSound] = usePersistentState(
    'hangman-sound',
    true,
    (v) => typeof v === 'boolean',
  );
  const [filterCommon, setFilterCommon] = usePersistentState(
    'hangman-filter-common',
    false,
    (v) => typeof v === 'boolean',
  );
  const [highscore, setHighscore] = usePersistentState(
    'hangman-highscore',
    0,
    (v) => typeof v === 'number',
  );
  const [stats, setStats] = usePersistentState(
    'hangman-stats',
    {},
    (v) => v && typeof v === 'object',
  );
  const bestTimeKey = useMemo(
    () => `hangman-best-time:${difficulty}:${dict}`,
    [difficulty, dict],
  );
  const [bestTime, setBestTime] = usePersistentState(
    bestTimeKey,
    null,
    (v) => v === null || typeof v === 'number',
  );
  const [timer, setTimer] = useState({
    startedAt: null,
    elapsedMs: 0,
    running: false,
  });
  const [tick, setTick] = useState(0);
  const [timeBonus, setTimeBonus] = useState(0);
  const timerRef = useRef(timer);

  const gameRef = useRef(game);
  const snapshotRef = useRef({ game, paused });

  const letters = useMemo(() => getGuessPool(filterCommon), [filterCommon]);

  useEffect(() => {
    reduceMotionRef.current = prefersReducedMotion;
  }, [prefersReducedMotion]);

  useEffect(() => {
    gameRef.current = game;
    snapshotRef.current = { game, paused };
  }, [game, paused]);

  useEffect(() => {
    timerRef.current = timer;
  }, [timer]);

  useEffect(() => {
    if (!timer.running) return undefined;
    const interval = setInterval(() => {
      setTick(Date.now());
    }, 250);
    return () => clearInterval(interval);
  }, [timer.running]);

  useEffect(() => {
    if (didInitDraftRef.current) return;
    if (customDraft) {
      didInitDraftRef.current = true;
      return;
    }
    if (customWords.length) {
      setCustomDraft(customWords.join('\n'));
    }
    didInitDraftRef.current = true;
  }, [customDraft, customWords, setCustomDraft]);

  useEffect(() => {
    return () => {
      try {
        audioCtxRef.current?.close?.();
      } catch {
        // ignore
      }
      audioCtxRef.current = null;
    };
  }, []);

  useEffect(() => {
    const wrap = canvasWrapRef.current;
    const canvas = canvasRef.current;
    if (!wrap || !canvas) return undefined;
    const resize = () => {
      const rect = wrap.getBoundingClientRect();
      if (!rect.width || !rect.height) return;
      const dpr = window.devicePixelRatio || 1;
      canvas.style.width = `${rect.width}px`;
      canvas.style.height = `${rect.height}px`;
      canvas.width = Math.max(1, Math.floor(rect.width * dpr));
      canvas.height = Math.max(1, Math.floor(rect.height * dpr));
    };
    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(wrap);
    window.addEventListener('orientationchange', resize);
    return () => {
      observer.disconnect();
      window.removeEventListener('orientationchange', resize);
    };
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;
    return createHangmanRenderer({
      canvas,
      getSnapshot: () => snapshotRef.current,
      prefersReducedMotion: () => reduceMotionRef.current,
    });
  }, []);

  useEffect(() => {
    if (!topics.length) return;
    if (!dict || !dictionaries[dict]) {
      setDict(topics[0]);
    }
  }, [dict, dictionaries, setDict, topics]);

  const getElapsedMs = useCallback(() => {
    const current = timerRef.current;
    if (current.running && current.startedAt) {
      return current.elapsedMs + (Date.now() - current.startedAt);
    }
    return current.elapsedMs;
  }, []);

  const stopTimer = useCallback(() => {
    setTimer((prev) => {
      if (!prev.running) return prev;
      const elapsed =
        prev.elapsedMs + (Date.now() - (prev.startedAt || Date.now()));
      return {
        startedAt: null,
        elapsedMs: elapsed,
        running: false,
      };
    });
  }, []);

  const startTimer = useCallback(() => {
    setTimer((prev) => ({
      ...prev,
      startedAt: Date.now(),
      running: true,
    }));
  }, []);

  const getTimeBonus = useCallback((elapsedSeconds, diff) => {
    const targets = {
      casual: 140,
      standard: 110,
      hard: 90,
    };
    const target = targets[diff] ?? targets.standard;
    const bonus = Math.floor((target - elapsedSeconds) * 2);
    return Math.max(0, bonus);
  }, []);

  useEffect(() => {
    if (game.status !== 'won' && game.status !== 'lost') return;
    const key = `${game.category}:${game.word}:${game.status}`;
    if (endKeyRef.current === key) return;
    endKeyRef.current = key;

    try {
      const elapsedMs = getElapsedMs();
      stopTimer();
      const elapsedSeconds = Math.max(1, Math.round(elapsedMs / 1000));
      const bonus = game.status === 'won' ? getTimeBonus(elapsedSeconds, game.difficulty) : 0;
      const finalScore = game.score + bonus;
      setTimeBonus(bonus);

      logGameEnd('hangman', game.status === 'won' ? 'win' : 'lose');
      if (game.status === 'won') {
        setAnnouncement(`You won! The phrase was ${game.word}.`);
        if (!reduceMotionRef.current) {
          launchConfetti(90);
        }
      } else {
        setAnnouncement(`You lost. The phrase was ${game.word}.`);
      }

      setStats((prev) => {
        const next = { ...(prev || {}) };
        const entry = next[game.category] || { plays: 0, wins: 0 };
        entry.plays += 1;
        if (game.status === 'won') entry.wins += 1;
        next[game.category] = entry;
        return next;
      });

      if (game.status === 'won') {
        if (bestTime === null || elapsedMs < bestTime) {
          setBestTime(elapsedMs);
        }
        if (finalScore > highscore) {
          setHighscore(finalScore);
        }
      }
    } catch (err) {
      logGameError('hangman', err?.message || String(err));
    }
  }, [
    bestTime,
    game,
    getElapsedMs,
    getTimeBonus,
    highscore,
    setBestTime,
    setHighscore,
    setStats,
    stopTimer,
  ]);

  const playTone = useCallback(
    (freq) => {
      if (!sound) return;
      try {
        if (!audioCtxRef.current) {
          const AudioContextClass = window.AudioContext || window.webkitAudioContext;
          if (!AudioContextClass) return;
          audioCtxRef.current = new AudioContextClass();
        }
        const ctx = audioCtxRef.current;
        if (!ctx) return;

        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.value = freq;
        gain.gain.value = 0.04;
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.08);
      } catch {
        // ignore audio errors
      }
    },
    [sound],
  );

  const formatTime = useCallback((ms) => {
    const totalSeconds = Math.max(0, Math.floor(ms / 1000));
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  }, []);

  const startNewGame = useCallback(
    ({ category, word, difficulty: nextDifficulty, seed: nextSeed } = {}) => {
      try {
        const nextCategory = category || dict;
        const difficultyToUse = nextDifficulty || difficulty;
        const list = dictionaries?.[nextCategory] ?? [];
        if (!word && (!Array.isArray(list) || list.length === 0)) {
          setError('No words available for this category.');
          setAnnouncement('Unable to start: empty dictionary.');
          setGame({
            ...createEmptyState(difficultyToUse),
            category: nextCategory,
          });
          return;
        }

        setError('');
        endKeyRef.current = '';
        setPaused(false);
        setTimeBonus(0);
        const seedValue = nextSeed ?? Date.now();
        setSeed(seedValue);
        const nextGame = newGame({
          category: nextCategory,
          word,
          dictionaries,
          difficulty: difficultyToUse,
          seed: seedValue,
        });
        setGame(nextGame);
        setAnnouncement('New game started.');
        setTimer({
          startedAt: nextGame.status === 'playing' ? Date.now() : null,
          elapsedMs: 0,
          running: nextGame.status === 'playing',
        });
        logGameStart('hangman');
      } catch (err) {
        setError('Unable to start the game.');
        setAnnouncement('Unable to start the game.');
        logGameError('hangman', err?.message || String(err));
      }
    },
    [dict, dictionaries, difficulty],
  );

  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const w = params.get('word');
      const d = params.get('category') || params.get('dict');
      const difficultyParam = params.get('difficulty');
      const seedParam = params.get('seed');
      if (typeof d === 'string' && dictionaries[d]) {
        setDict(d);
      }
      if (isDifficulty(difficultyParam)) {
        setDifficulty(difficultyParam);
      }
      if (typeof w === 'string' && w.length) {
        startNewGame({
          word: w,
          category: d && dictionaries[d] ? d : dict,
          difficulty: isDifficulty(difficultyParam) ? difficultyParam : undefined,
        });
        return;
      }
      if (seedParam) {
        startNewGame({
          category: d && dictionaries[d] ? d : dict,
          difficulty: isDifficulty(difficultyParam) ? difficultyParam : undefined,
          seed: seedParam,
        });
      }
    } catch {
      // ignore URL parsing errors
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleGuess = useCallback(
    (letter) => {
      if (paused) {
        setAnnouncement('Game paused. Press P to resume.');
        return;
      }
      const update = applyGuess(gameRef.current, letter);
      setGame(update.state);

      switch (update.event.type) {
        case 'already':
          setAnnouncement(`Already guessed ${update.event.letter.toUpperCase()}.`);
          break;
        case 'invalid':
          setAnnouncement('Only letters A-Z are allowed.');
          break;
        case 'correct':
          playTone(660);
          logEvent({ category: 'hangman', action: 'guess', label: letter });
          setAnnouncement(`Nice! ${letter.toUpperCase()} is in the phrase.`);
          break;
        case 'wrong':
          playTone(220);
          logEvent({ category: 'hangman', action: 'guess', label: letter });
          setAnnouncement(`No ${letter.toUpperCase()} in this phrase.`);
          break;
        case 'won':
          playTone(760);
          break;
        case 'lost':
          playTone(180);
          break;
        default:
          break;
      }
    },
    [paused, playTone],
  );

  const handleHint = useCallback(() => {
    if (paused) {
      setAnnouncement('Game paused. Press P to resume.');
      return;
    }
    const update = applyHint(gameRef.current);
    setGame(update.state);

    switch (update.event.type) {
      case 'no-hints':
        setAnnouncement('No hints remaining for this round.');
        break;
      case 'hint':
        logEvent({ category: 'hangman', action: 'hint', label: update.event.letter });
        setAnnouncement(
          `Hint revealed ${update.event.letter.toUpperCase()}.`,
        );
        playTone(520);
        break;
      case 'won':
        playTone(760);
        break;
      default:
        break;
    }
  }, [paused, playTone]);

  const togglePause = useCallback(() => {
    setPaused((prev) => {
      const next = !prev;
      setAnnouncement(next ? 'Paused. Press P to resume.' : 'Resumed.');
      if (next) {
        stopTimer();
      } else if (gameRef.current.status === 'playing') {
        startTimer();
      }
      return next;
    });
  }, [startTimer, stopTimer]);

  const shareLink = useCallback(async () => {
    if (!game.word) return;
    try {
      if (dict === 'custom') {
        setAnnouncement('Custom lists require manual sharing. Try sharing an image.');
        return;
      }
      const url = new URL(window.location.href);
      url.searchParams.delete('word');
      url.searchParams.set('category', dict);
      url.searchParams.set('difficulty', game.difficulty);
      url.searchParams.set('seed', seed ?? Date.now());
      const ok = await safeClipboardWriteText(url.toString());
      setAnnouncement(ok ? 'Challenge link copied.' : 'Unable to copy the link.');
    } catch (err) {
      logGameError('hangman', err?.message || String(err));
      setAnnouncement('Unable to create challenge link.');
    }
  }, [dict, game.difficulty, game.word, seed]);

  const shareImage = useCallback(async () => {
    try {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const blob = await new Promise((resolve) => {
        canvas.toBlob((b) => resolve(b), 'image/png');
      });

      if (!blob) {
        setAnnouncement('Unable to capture image.');
        return;
      }

      if (navigator.clipboard && window.ClipboardItem) {
        const item = new window.ClipboardItem({ 'image/png': blob });
        await navigator.clipboard.write([item]);
        setAnnouncement('Image copied to clipboard.');
        return;
      }

      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `hangman-${dict}-${game.word}.png`;
      a.click();
      URL.revokeObjectURL(url);
      setAnnouncement('Image downloaded.');
    } catch (err) {
      logGameError('hangman', err?.message || String(err));
      setAnnouncement('Unable to share image.');
    }
  }, [dict, game.word]);

  const handleImport = useCallback(() => {
    const result = sanitizeWordList(customDraft);
    if (!result.words.length) {
      setCustomStatus('No valid words found. Use letters, spaces, or hyphens.');
      return;
    }
    setCustomWords(result.words);
    setCustomDraft(result.words.join('\n'));
    setCustomStatus(
      `Imported ${result.words.length} word${result.words.length === 1 ? '' : 's'
      }${result.truncated ? ' (trimmed to 200 entries).' : '.'}`,
    );
    setDict('custom');
    setAnnouncement('Custom list imported. Ready to play.');
  }, [customDraft, setCustomWords, setDict]);

  const startDailyGame = useCallback(() => {
    const dateKey = getUtcDateKey();
    startNewGame({
      category: dict,
      difficulty,
      seed: buildDailySeed(dict, difficulty),
    });
    setAnnouncement(`Daily challenge started for ${dateKey} (UTC).`);
  }, [dict, difficulty, startNewGame]);

  const clearCustom = useCallback(() => {
    setCustomWords([]);
    setCustomDraft('');
    setCustomStatus('Custom list cleared.');
    setAnnouncement('Custom list cleared.');
  }, [setCustomWords]);

  const keyHandler = useCallback(
    (e) => {
      if (!shouldHandleGameKey(e, { isFocused })) return;

      const k = e.key.toLowerCase();
      if (k === 'p') {
        consumeGameKey(e);
        togglePause();
        return;
      }
      if (k === 's') {
        consumeGameKey(e);
        setSound((v) => !v);
        return;
      }
      if (k === 'h') {
        consumeGameKey(e);
        handleHint();
        return;
      }
      if (k === 'r') {
        consumeGameKey(e);
        startNewGame({ category: dict });
        return;
      }
      if (letters.includes(k)) {
        consumeGameKey(e);
        handleGuess(k);
      }
    },
    [
      dict,
      handleGuess,
      handleHint,
      isFocused,
      letters,
      setSound,
      startNewGame,
      togglePause,
    ],
  );

  useEffect(() => {
    window.addEventListener('keydown', keyHandler);
    return () => window.removeEventListener('keydown', keyHandler);
  }, [keyHandler]);

  const frequencies = useMemo(() => {
    const list = Array.isArray(dictionaries[dict]) ? dictionaries[dict] : [];
    const counts = {};
    letters.forEach((l) => {
      counts[l] = 0;
    });
    list.forEach((w) => {
      if (typeof w !== 'string') return;
      w.toLowerCase()
        .split('')
        .forEach((l) => {
          if (counts[l] !== undefined) counts[l] += 1;
        });
    });
    const max = Math.max(1, ...Object.values(counts));
    const normalized = {};
    Object.keys(counts).forEach((l) => {
      normalized[l] = max > 0 ? counts[l] / max : 0;
    });
    return normalized;
  }, [dict, dictionaries, letters]);

  const dictStats = stats && typeof stats === 'object' ? stats[dict] : null;
  const plays = dictStats?.plays || 0;
  const wins = dictStats?.wins || 0;
  const winRate = plays ? Math.round((wins / plays) * 100) : 0;

  const maskedWord = game.word ? getMaskedWord(game) : '';
  const remainingLetters = getRemainingLetters(game).length;
  const maxWrong = game.maxWrong || DIFFICULTY_PRESETS[game.difficulty]?.maxWrong || 6;
  const won = isWin(game);
  const lost = isLose(game);
  const elapsedMs = getElapsedMs() + (tick ? 0 : 0);
  const elapsedLabel = formatTime(elapsedMs);
  const bestTimeLabel = bestTime ? formatTime(bestTime) : '—';
  const finalScore = won ? game.score + timeBonus : game.score;
  const isCustom = dict === 'custom';
  const startLabel = game.word ? 'New game' : 'Start';
  const isPlaying = game.status === 'playing';
  const isDailySeed = typeof seed === 'string' && seed.startsWith('daily:');
  const dailyDate = isDailySeed ? seed.split(':')[1] || '' : '';

  return (
    <div className="h-full w-full flex flex-col bg-[var(--kali-bg)] text-[var(--kali-text)]">
      <div className="flex flex-wrap items-center gap-2 p-2 border-b border-[color:var(--kali-border)] bg-[var(--kali-surface)]">
        <label className="flex items-center gap-2">
          <span className="text-xs uppercase tracking-wide text-[var(--kali-text-muted)]">
            Category
          </span>
          <select
            className="rounded bg-[var(--kali-overlay)] px-2 py-1 text-sm text-[var(--kali-text)] border border-[color:var(--kali-border)] focus:outline-none focus:ring focus:ring-[color:var(--kali-control)]"
            value={dict}
            onChange={(e) => {
              const next = e.target.value;
              setDict(next);
              startNewGame({ category: next });
            }}
            aria-label="Category"
          >
            {topics.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </label>

        <label className="flex items-center gap-2">
          <span className="text-xs uppercase tracking-wide text-[var(--kali-text-muted)]">
            Difficulty
          </span>
          <select
            className="rounded bg-[var(--kali-overlay)] px-2 py-1 text-sm text-[var(--kali-text)] border border-[color:var(--kali-border)] focus:outline-none focus:ring focus:ring-[color:var(--kali-control)]"
            value={difficulty}
            onChange={(e) => {
              const next = e.target.value;
              setDifficulty(next);
              setAnnouncement(`Difficulty set to ${next}.`);
              startNewGame({ category: dict, difficulty: next });
            }}
            aria-label="Difficulty"
          >
            {Object.values(DIFFICULTY_PRESETS).map((preset) => (
              <option key={preset.id} value={preset.id}>
                {preset.label}
              </option>
            ))}
          </select>
        </label>

        <button
          className="rounded bg-[var(--kali-overlay)] px-3 py-1 text-sm hover:bg-[var(--kali-control-overlay)] focus:outline-none focus:ring focus:ring-[color:var(--kali-control)] disabled:opacity-50"
          onClick={() => startNewGame({ category: dict })}
          type="button"
          aria-label={startLabel}
          disabled={!topics.length}
        >
          {startLabel}
        </button>

        <button
          className="rounded bg-[var(--kali-overlay)] px-3 py-1 text-sm hover:bg-[var(--kali-control-overlay)] focus:outline-none focus:ring focus:ring-[color:var(--kali-control)] disabled:opacity-50"
          onClick={startDailyGame}
          type="button"
          disabled={!topics.length || isCustom}
          title="Daily challenge (UTC). Same puzzle for everyone today."
          aria-label="Daily"
        >
          Daily
        </button>

        <button
          className="rounded bg-[var(--kali-overlay)] px-3 py-1 text-sm hover:bg-[var(--kali-control-overlay)] focus:outline-none focus:ring focus:ring-[color:var(--kali-control)] disabled:opacity-50"
          onClick={handleHint}
          type="button"
          disabled={!game.word || paused || won || lost || game.hintsRemaining <= 0}
          aria-label="Use hint"
          title={`Hint (H). Costs ${game.hintCost} points.`}
        >
          Hint ({game.hintsRemaining})
        </button>

        <button
          className="rounded bg-[var(--kali-overlay)] px-3 py-1 text-sm hover:bg-[var(--kali-control-overlay)] focus:outline-none focus:ring focus:ring-[color:var(--kali-control)]"
          onClick={() => setShowOptions((prev) => !prev)}
          type="button"
          aria-expanded={showOptions}
          aria-controls="hangman-options"
        >
          {showOptions ? 'Hide options' : 'Options'}
        </button>
      </div>

      <div className="px-2 pb-2 text-xs text-[var(--kali-text-muted)]">
        <span className="mr-3">
          Score: <span className="text-[var(--kali-text)]">{finalScore}</span>
        </span>
        <span className="mr-3" data-testid="hangman-timer">
          Time: <span className="text-[var(--kali-text)]">{elapsedLabel}</span>
        </span>
        <span className="mr-3">
          Wrong: <span className="text-[var(--kali-text)]">{game.wrong}/{maxWrong}</span>
        </span>
        {isDailySeed && dailyDate && (
          <span className="mr-3">
            Daily: <span className="text-[var(--kali-text)]">{dailyDate} (UTC)</span>
          </span>
        )}
      </div>

      {showOptions && (
        <div
          id="hangman-options"
          className="mx-2 mt-2 rounded border border-[color:var(--kali-border)] bg-[var(--kali-surface)] px-3 py-3 text-xs text-[var(--kali-text-muted)]"
        >
          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <div className="text-xs uppercase tracking-wide text-[var(--kali-text-subtle)]">
                Controls
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <button
                  className="rounded bg-[var(--kali-overlay)] px-3 py-1 text-xs hover:bg-[var(--kali-control-overlay)] focus:outline-none focus:ring focus:ring-[color:var(--kali-control)] disabled:opacity-50"
                  onClick={togglePause}
                  type="button"
                  aria-pressed={paused}
                  aria-label={paused ? 'Resume' : 'Pause'}
                  disabled={!game.word || won || lost}
                >
                  {paused ? 'Resume' : 'Pause'}
                </button>
                <button
                  className="rounded bg-[var(--kali-overlay)] px-3 py-1 text-xs hover:bg-[var(--kali-control-overlay)] focus:outline-none focus:ring focus:ring-[color:var(--kali-control)]"
                  onClick={() => setSound((v) => !v)}
                  type="button"
                  aria-pressed={sound}
                  aria-label={sound ? 'Sound on' : 'Sound off'}
                  title="Toggle sound (S)"
                >
                  {sound ? 'Sound: On' : 'Sound: Off'}
                </button>
                <button
                  className="rounded bg-[var(--kali-overlay)] px-3 py-1 text-xs hover:bg-[var(--kali-control-overlay)] focus:outline-none focus:ring focus:ring-[color:var(--kali-control)]"
                  onClick={() => setFilterCommon((f) => !f)}
                  type="button"
                  aria-pressed={filterCommon}
                  aria-label={
                    filterCommon
                      ? 'Exclude common letters on'
                      : 'Exclude common letters off'
                  }
                  title="Exclude common letters from the keyboard"
                >
                  {filterCommon ? 'Exclude common: On' : 'Exclude common: Off'}
                </button>
                <button
                  className="rounded bg-[var(--kali-overlay)] px-3 py-1 text-xs hover:bg-[var(--kali-control-overlay)] focus:outline-none focus:ring focus:ring-[color:var(--kali-control)] disabled:opacity-50"
                  onClick={shareLink}
                  type="button"
                  disabled={!game.word || isCustom}
                  aria-label="Copy challenge link"
                >
                  Copy link
                </button>
                <button
                  className="rounded bg-[var(--kali-overlay)] px-3 py-1 text-xs hover:bg-[var(--kali-control-overlay)] focus:outline-none focus:ring focus:ring-[color:var(--kali-control)] disabled:opacity-50"
                  onClick={shareImage}
                  type="button"
                  disabled={!game.word}
                  aria-label="Copy game image"
                >
                  Copy image
                </button>
                <button
                  className="rounded bg-[var(--kali-overlay)] px-3 py-1 text-xs hover:bg-[var(--kali-control-overlay)] focus:outline-none focus:ring focus:ring-[color:var(--kali-control)]"
                  onClick={() => setShowHelp((prev) => !prev)}
                  type="button"
                  aria-expanded={showHelp}
                  aria-controls="hangman-help"
                >
                  Shortcuts
                </button>
              </div>
            </div>
            <div>
              <div className="text-xs uppercase tracking-wide text-[var(--kali-text-subtle)]">
                Stats
              </div>
              <div className="mt-2 grid gap-1 text-[var(--kali-text)]">
                <span>High score: {highscore}</span>
                <span>Hints left: {game.hintsRemaining}</span>
                <span>Remaining letters: {remainingLetters}</span>
                <span>Win rate: {winRate}% ({wins}/{plays})</span>
                <span>Best time: {bestTimeLabel}</span>
              </div>
              {timeBonus > 0 && (
                <div className="mt-2 text-[var(--kali-text)]">
                  Time bonus: +{timeBonus}
                </div>
              )}
            </div>
          </div>

          <div className="mt-3 rounded border border-[color:var(--kali-border)] bg-[var(--kali-overlay)] p-3">
            <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
              <div>
                <div className="text-xs uppercase tracking-wide text-[var(--kali-text-subtle)]">
                  Custom word list
                </div>
                <div className="text-xs text-[var(--kali-text-muted)]">
                  Paste words or short phrases (letters, spaces, hyphens). One per line.
                </div>
              </div>
              <div className="text-xs text-[var(--kali-text-muted)]">
                {customWords.length ? `${customWords.length} saved` : 'No custom list yet'}
              </div>
            </div>
            <textarea
              className="mt-2 h-24 w-full rounded border border-[color:var(--kali-border)] bg-[var(--kali-bg)] p-2 text-xs text-[var(--kali-text)] focus:outline-none focus:ring focus:ring-[color:var(--kali-control)]"
              placeholder="e.g. red moon\nblue-sky\nstar wars"
              value={customDraft}
              onChange={(e) => setCustomDraft(e.target.value)}
              aria-label="Custom word list"
            />
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <button
                type="button"
                className="rounded bg-[var(--kali-overlay)] px-3 py-1 text-xs hover:bg-[var(--kali-control-overlay)] focus:outline-none focus:ring focus:ring-[color:var(--kali-control)]"
                onClick={handleImport}
              >
                Import list
              </button>
              <button
                type="button"
                className="rounded bg-[var(--kali-overlay)] px-3 py-1 text-xs hover:bg-[var(--kali-control-overlay)] focus:outline-none focus:ring focus:ring-[color:var(--kali-control)]"
                onClick={clearCustom}
                disabled={!customWords.length}
              >
                Clear list
              </button>
              <button
                type="button"
                className="rounded bg-[var(--kali-overlay)] px-3 py-1 text-xs hover:bg-[var(--kali-control-overlay)] focus:outline-none focus:ring focus:ring-[color:var(--kali-control)]"
                onClick={() => startNewGame({ category: 'custom' })}
                disabled={!customWords.length}
              >
                Play custom
              </button>
              {customStatus && (
                <span className="text-xs text-[var(--kali-text)]">{customStatus}</span>
              )}
            </div>
          </div>

          {showHelp && (
            <div
              id="hangman-help"
              className="mt-3 rounded border border-[color:var(--kali-border)] bg-[var(--kali-overlay)] px-3 py-2 text-xs text-[var(--kali-text)]"
            >
              <div className="font-semibold text-[var(--kali-text)]">
                Keyboard shortcuts
              </div>
              <div className="mt-1 grid gap-1 sm:grid-cols-2">
                <span>A-Z: Guess</span>
                <span>H: Hint</span>
                <span>R: New game</span>
                <span>P: Pause/Resume</span>
                <span>S: Sound toggle</span>
              </div>
            </div>
          )}
        </div>
      )}

      {error && (
        <div className="px-2 pb-2 text-sm text-[var(--color-danger)]" role="alert">
          {error}
        </div>
      )}

      <div className="sr-only" aria-live="polite" role="status">
        {announcement}
      </div>

      {announcement && (
        <div className="px-2 pb-2 text-sm text-[var(--kali-text)]" aria-live="polite" role="status">
          {announcement}
        </div>
      )}

      {!game.word ? (
        <div className="flex-1 flex items-center justify-center text-[var(--kali-text)]">
          <div className="max-w-md text-center px-4">
            <div className="text-lg font-mono">Hangman</div>
            <div className="mt-2 text-sm text-[var(--kali-text-muted)]">
              Pick a category, then click Start. Type letters or tap the keyboard.
            </div>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex flex-col">
          <div className="flex justify-center px-2">
            <div
              ref={canvasWrapRef}
              className="w-full max-w-[560px] aspect-[21/13] rounded border border-[color:var(--kali-border)] bg-[var(--kali-bg)]"
            >
              <canvas
                ref={canvasRef}
                className="h-full w-full rounded"
                role="img"
                aria-label="Hangman game board"
              />
            </div>
          </div>

          <div className="mt-3 px-2 flex-1 overflow-auto">
            <div className="mx-auto max-w-[560px]">
              <div className="rounded border border-[color:var(--kali-border)] bg-[var(--kali-surface)] px-3 py-2 text-center">
                <div className="text-xs uppercase tracking-wide text-[var(--kali-text-muted)]">Phrase</div>
                <div
                  className="mt-1 font-mono text-lg tracking-[0.2em] text-[var(--kali-text)]"
                  aria-live="polite"
                  data-testid="hangman-phrase"
                >
                  {maskedWord || '—'}
                </div>
              </div>

              <div className="mt-3 grid grid-cols-7 gap-1 sm:grid-cols-9">
                {letters.map((l) => {
                  const used = game.guessed.includes(l);
                  const correct = used && game.word.includes(l);
                  const intensity = frequencies[l] ?? 0;
                  const bg = used
                    ? correct
                      ? 'rgba(34,197,94,0.55)'
                      : 'rgba(239,68,68,0.55)'
                    : `rgba(56,189,248,${0.12 + intensity * 0.35})`;

                  return (
                    <button
                      key={l}
                      type="button"
                      onClick={() => handleGuess(l)}
                      disabled={!game.word || paused || won || lost || used}
                      aria-label={`Guess ${l.toUpperCase()}${used ? ' (used)' : ''}`}
                      className="rounded px-2 py-2 text-sm font-mono border border-[color:var(--kali-border)] hover:border-[color:var(--kali-control)] focus:outline-none focus:ring focus:ring-[color:var(--kali-control)] disabled:opacity-60"
                      style={{ backgroundColor: bg }}
                    >
                      {l.toUpperCase()}
                    </button>
                  );
                })}
              </div>

              {(won || lost) && (
                <div className="mt-4 text-center">
                  <div
                    className={`text-lg font-mono ${won ? 'text-[var(--color-success)]' : 'text-[var(--color-danger)]'
                      }`}
                  >
                    {won ? 'You won!' : 'You lost'}
                  </div>
                  <div className="mt-1 text-sm text-[var(--kali-text)]">
                    Phrase:{' '}
                    <span className="font-mono text-[var(--kali-text)]">
                      {game.word.toUpperCase()}
                    </span>
                  </div>
                  <div className="mt-1 text-sm text-[var(--kali-text-muted)]">
                    Time: {elapsedLabel}
                  </div>
                  {won && (
                    <div className="mt-1 text-sm text-[var(--kali-text-muted)]">
                      Time bonus: +{timeBonus} · Total score: {finalScore}
                    </div>
                  )}
                  <div className="mt-3 flex items-center justify-center gap-2">
                    <button
                      type="button"
                      className="rounded bg-[var(--kali-overlay)] px-3 py-1 text-sm hover:bg-[var(--kali-control-overlay)] focus:outline-none focus:ring focus:ring-[color:var(--kali-control)]"
                      onClick={() => startNewGame({ category: dict })}
                    >
                      Play again
                    </button>
                    <button
                      type="button"
                      className="rounded bg-[var(--kali-overlay)] px-3 py-1 text-sm hover:bg-[var(--kali-control-overlay)] focus:outline-none focus:ring focus:ring-[color:var(--kali-control)]"
                      onClick={shareImage}
                    >
                      Share image
                    </button>
                  </div>
                </div>
              )}

              {isPlaying && game.hintsRemaining > 0 && (
                <div className="mt-3 text-xs text-[var(--kali-text-muted)]">
                  Need help? Hints reveal a random letter and cost {game.hintCost} points.
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Hangman;
