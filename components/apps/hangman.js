import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import confetti from 'canvas-confetti';
import usePersistentState from '../../hooks/usePersistentState';
import {
  logEvent,
  logGameStart,
  logGameEnd,
  logGameError,
} from '../../utils/analytics';
import { DICTIONARIES } from '../../apps/hangman/engine';
import { getGuessPool } from '../../apps/games/hangman/logic';

const DIFFICULTY_CONFIG = {
  chill: {
    label: 'Casual',
    duration: 180,
    baseHints: 4,
    description: 'Longer timer and extra hints for relaxed play sessions.',
  },
  classic: {
    label: 'Classic',
    duration: 120,
    baseHints: 3,
    description: 'Balanced countdown inspired by traditional hangman pacing.',
  },
  hardcore: {
    label: 'Survival',
    duration: 75,
    baseHints: 2,
    description: 'Short timer, fewer hints, and higher pressure for experts.',
  },
};

const easeOutCubic = (t) => 1 - (1 - t) ** 3;

const drawLine = (ctx, x1, y1, x2, y2, progress) => {
  const eased = easeOutCubic(progress);
  ctx.save();
  ctx.setLineDash([100]);
  ctx.lineDashOffset = (1 - eased) * 100;
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();
  ctx.restore();
};

const HANGMAN_PARTS = [
  (ctx, p) => {
    const eased = easeOutCubic(p);
    ctx.save();
    ctx.setLineDash([100]);
    ctx.lineDashOffset = (1 - eased) * 100;
    ctx.beginPath();
    ctx.arc(120, 60, 20, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  },
  (ctx, p) => drawLine(ctx, 120, 80, 120, 140, p),
  (ctx, p) => drawLine(ctx, 120, 100, 90, 120, p),
  (ctx, p) => drawLine(ctx, 120, 100, 150, 120, p),
  (ctx, p) => drawLine(ctx, 120, 140, 100, 170, p),
  (ctx, p) => drawLine(ctx, 120, 140, 140, 170, p),
];

const MAX_PARTS = HANGMAN_PARTS.length;
const SUCCESS_COLOR = '#0072B2';
const FAILURE_COLOR = '#D55E00';
const RING_RADIUS = 24;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

const formatCategory = (key) =>
  key
    .split(/[-_]/)
    .map((chunk) => chunk.charAt(0).toUpperCase() + chunk.slice(1))
    .join(' ');

const Hangman = () => {
  const topics = useMemo(
    () => Object.keys(DICTIONARIES).sort((a, b) => a.localeCompare(b)),
    [],
  );
  const canvasRef = useRef(null);
  const animationRef = useRef(null);
  const audioCtxRef = useRef(null);
  const partProgressRef = useRef(new Array(MAX_PARTS).fill(0));
  const partStartRef = useRef(new Array(MAX_PARTS).fill(0));
  const gallowsProgressRef = useRef(0);
  const gallowsStartRef = useRef(0);
  const reduceMotionRef = useRef(false);
  const letterButtonRefs = useRef([]);

  const [difficulty, setDifficulty] = usePersistentState(
    'hangman-difficulty',
    'classic',
    (value) => typeof value === 'string' && value in DIFFICULTY_CONFIG,
  );
  const difficultySettings = useMemo(
    () => DIFFICULTY_CONFIG[difficulty] || DIFFICULTY_CONFIG.classic,
    [difficulty],
  );
  const [pendingDict, setPendingDict] = useState(() => topics[0] || '');
  const [dict, setDict] = useState('');
  const [word, setWord] = useState('');
  const [guessed, setGuessed] = useState([]);
  const [wrong, setWrong] = useState(0);
  const [score, setScore] = useState(0);
  const [paused, setPaused] = useState(false);
  const [sound, setSound] = usePersistentState(
    'hangman-sound',
    true,
    (value) => typeof value === 'boolean',
  );
  const [highscore, setHighscore] = usePersistentState(
    'hangman-highscore',
    0,
    (value) => typeof value === 'number',
  );
  const [hintCoins, setHintCoins] = usePersistentState(
    'hangman-hint-coins',
    DIFFICULTY_CONFIG.classic.baseHints,
    (value) => typeof value === 'number',
  );
  const [stats, setStats] = usePersistentState(
    'hangman-stats',
    {},
    (value) => value !== null && typeof value === 'object',
  );
  const [filterCommonLetters, setFilterCommonLetters] = usePersistentState(
    'hangman-filter-common',
    false,
    (value) => typeof value === 'boolean',
  );
  const [hardMode, setHardMode] = useState(false);
  const [announcement, setAnnouncement] = useState('');
  const [history, setHistory] = usePersistentState(
    'hangman-history',
    [],
    (value) => Array.isArray(value),
  );
  const [timeLeft, setTimeLeft] = useState(difficultySettings.duration);

  const letters = useMemo(
    () => getGuessPool(filterCommonLetters),
    [filterCommonLetters],
  );
  const normalizedWord = word.toLowerCase();
  const won =
    normalizedWord &&
    normalizedWord.split('').every((letter) => guessed.includes(letter));
  const timeExpired = normalizedWord && timeLeft <= 0;
  const lost = !won && (wrong >= MAX_PARTS || timeExpired);

  const frequencies = useMemo(() => {
    const counts = Object.fromEntries(letters.map((letter) => [letter, 0]));
    (DICTIONARIES[dict] || []).forEach((entry) => {
      entry.split('').forEach((char) => {
        if (counts[char] !== undefined) counts[char] += 1;
      });
    });
    const max = Math.max(1, ...Object.values(counts));
    return { counts, max };
  }, [dict, letters]);

  const playTone = useCallback(
    (frequency) => {
      if (!sound) return;
      try {
        const ctx =
          audioCtxRef.current ||
          (audioCtxRef.current = new (window.AudioContext ||
            window.webkitAudioContext)());
        const oscillator = ctx.createOscillator();
        const gain = ctx.createGain();
        oscillator.frequency.value = frequency;
        oscillator.connect(gain);
        gain.connect(ctx.destination);
        oscillator.start();
        gain.gain.exponentialRampToValueAtTime(
          0.0001,
          ctx.currentTime + 0.25,
        );
        oscillator.stop(ctx.currentTime + 0.25);
      } catch (error) {
        // Ignore audio initialisation errors in unsupported browsers.
      }
    },
    [sound],
  );
  const reset = useCallback(
    (forcedWord, forcedDict, forcedDifficulty) => {
      try {
        const dictionaryKey =
          forcedDict || dict || topics[0] || Object.keys(DICTIONARIES)[0];
        const pool = DICTIONARIES[dictionaryKey] || [];
        if (!pool.length) return;
        const difficultyKey =
          forcedDifficulty && DIFFICULTY_CONFIG[forcedDifficulty]
            ? forcedDifficulty
            : difficulty;
        const activeSettings =
          DIFFICULTY_CONFIG[difficultyKey] || difficultySettings;
        if (forcedDifficulty && forcedDifficulty !== difficulty)
          setDifficulty(forcedDifficulty);
        const chosenWord =
          forcedWord && pool.includes(forcedWord)
            ? forcedWord
            : pool[Math.floor(Math.random() * pool.length)];
        setDict(dictionaryKey);
        setPendingDict(dictionaryKey);
        setWord(chosenWord);
        setGuessed([]);
        setWrong(0);
        setScore(0);
        setPaused(false);
        setAnnouncement('');
        setHintCoins(activeSettings.baseHints);
        setTimeLeft(activeSettings.duration);
        partProgressRef.current = new Array(MAX_PARTS).fill(0);
        partStartRef.current = new Array(MAX_PARTS).fill(0);
        gallowsProgressRef.current = 0;
        gallowsStartRef.current = performance.now();
        logGameStart('hangman');
      } catch (error) {
        logGameError('hangman', error?.message || String(error));
      }
    },
    [dict, topics, difficulty, difficultySettings, setDifficulty, setHintCoins],
  );

  const handleGuess = useCallback(
    (letter) => {
      const normalized = letter.toLowerCase();
      if (
        paused ||
        !normalizedWord ||
        guessed.includes(normalized) ||
        wrong >= MAX_PARTS ||
        won ||
        lost
      )
        return;
      logEvent({
        category: 'hangman',
        action: 'guess',
        label: normalized,
      });
      const nextGuessed = [...guessed, normalized];
      setGuessed(nextGuessed);
      const correct = normalizedWord.includes(normalized);

      if (hardMode && correct) {
        const wrongLetters = nextGuessed.filter(
          (char) => !normalizedWord.includes(char),
        );
        const known = normalizedWord.split('').map((char) =>
          nextGuessed.includes(char) ? char : null,
        );
        const candidates = (DICTIONARIES[dict] || []).filter((entry) => {
          if (entry.length !== normalizedWord.length) return false;
          if (wrongLetters.some((wrongChar) => entry.includes(wrongChar)))
            return false;
          for (let idx = 0; idx < entry.length; idx += 1) {
            const knownChar = known[idx];
            if (knownChar && entry[idx] !== knownChar) return false;
          }
          return true;
        });
        const avoid = candidates.filter(
          (candidate) => !candidate.includes(normalized),
        );
        if (avoid.length) {
          const swapped = avoid[Math.floor(Math.random() * avoid.length)];
          setWord(swapped);
          playTone(200);
          const segmentIndex = wrong;
          partStartRef.current[segmentIndex] = performance.now();
          partProgressRef.current[segmentIndex] = reduceMotionRef.current ? 1 : 0;
          setWrong((value) => Math.min(MAX_PARTS, value + 1));
          setScore((value) => Math.max(0, value - 1));
          const remaining = Math.max(0, MAX_PARTS - (wrong + 1));
          setAnnouncement(
            `Stealth swap! ${remaining} ${
              remaining === 1 ? 'try' : 'tries'
            } left.`,
          );
          return;
        }
      }

      if (correct) {
        playTone(560);
        setScore((value) => value + 2);
        setAnnouncement(`Correct guess: ${normalized.toUpperCase()}`);
      } else {
        playTone(210);
        const segmentIndex = wrong;
        partStartRef.current[segmentIndex] = performance.now();
        partProgressRef.current[segmentIndex] = reduceMotionRef.current ? 1 : 0;
        setWrong((value) => Math.min(MAX_PARTS, value + 1));
        setScore((value) => Math.max(0, value - 1));
        const remaining = Math.max(0, MAX_PARTS - (wrong + 1));
        setAnnouncement(
          `Wrong guess: ${normalized.toUpperCase()}. ${remaining} ${
            remaining === 1 ? 'try' : 'tries'
          } left.`,
        );
      }
    },
    [
      paused,
      normalizedWord,
      guessed,
      wrong,
      won,
      lost,
      hardMode,
      dict,
      playTone,
    ],
  );

  const handleHint = useCallback(() => {
    if (paused || hintCoins <= 0 || !normalizedWord || won || lost) return;
    const remaining = normalizedWord
      .split('')
      .filter((letter) => !guessed.includes(letter));
    if (!remaining.length) return;
    const letter = remaining[Math.floor(Math.random() * remaining.length)];
    setHintCoins((value) => Math.max(0, value - 1));
    setScore((value) => Math.max(0, value - 5));
    handleGuess(letter);
  }, [
    paused,
    hintCoins,
    normalizedWord,
    guessed,
    handleGuess,
    won,
    lost,
    setHintCoins,
  ]);

  const togglePause = useCallback(() => setPaused((value) => !value), []);
  const toggleSound = useCallback(
    () => setSound((value) => !value),
    [setSound],
  );

  const shareLink = useCallback(() => {
    try {
      if (!normalizedWord) return;
      const params = new URLSearchParams({ dict, difficulty });
      params.set('word', normalizedWord);
      if (guessed.length) params.set('guessed', guessed.join(''));
      if (wrong) params.set('wrong', String(wrong));
      if (timeLeft !== difficultySettings.duration)
        params.set('time', String(timeLeft));
      const url = `${window.location.origin}${window.location.pathname}?${params.toString()}`;
      navigator.clipboard?.writeText(url);
      setAnnouncement('Link copied to clipboard');
    } catch (error) {
      logGameError('hangman', error?.message || String(error));
    }
  }, [
    dict,
    difficulty,
    normalizedWord,
    guessed,
    wrong,
    timeLeft,
    difficultySettings.duration,
  ]);

  const shareImage = useCallback(() => {
    try {
      const canvas = canvasRef.current;
      if (!canvas) return;
      canvas.toBlob(async (blob) => {
        if (!blob) return;
        try {
          await navigator.clipboard?.write([
            new window.ClipboardItem({ 'image/png': blob }),
          ]);
          setAnnouncement('Image copied to clipboard');
        } catch (error) {
          logGameError('hangman', error?.message || String(error));
        }
      });
    } catch (error) {
      logGameError('hangman', error?.message || String(error));
    }
  }, []);

  const keyHandler = useCallback(
    (event) => {
      const key = event.key.toLowerCase();
      if (key === 'r') reset();
      else if (key === 'p') togglePause();
      else if (key === 'h') handleHint();
      else if (key === 's') toggleSound();
      else if (/^[a-z]$/.test(key) && letters.includes(key)) handleGuess(key);
    },
    [reset, togglePause, handleHint, toggleSound, handleGuess, letters],
  );

  const handleDifficultyChange = useCallback(
    (nextDifficulty) => {
      if (!(nextDifficulty in DIFFICULTY_CONFIG)) return;
      if (!normalizedWord) {
        setDifficulty(nextDifficulty);
        setHintCoins(DIFFICULTY_CONFIG[nextDifficulty].baseHints);
        setTimeLeft(DIFFICULTY_CONFIG[nextDifficulty].duration);
        return;
      }
      if (nextDifficulty === difficulty) return;
      logEvent({
        category: 'hangman',
        action: 'difficulty-change',
        label: nextDifficulty,
      });
      reset(undefined, dict || pendingDict, nextDifficulty);
    },
    [
      normalizedWord,
      difficulty,
      reset,
      dict,
      pendingDict,
      setDifficulty,
      setHintCoins,
    ],
  );

  const lettersPerRow = 9;
  const handleLetterGridNavigation = useCallback(
    (event) => {
      const { key } = event;
      const index = Number(event.currentTarget.dataset.index);
      if (Number.isNaN(index)) return;
      let targetIndex = null;
      if (key === 'ArrowRight') targetIndex = (index + 1) % letters.length;
      else if (key === 'ArrowLeft')
        targetIndex = (index - 1 + letters.length) % letters.length;
      else if (key === 'ArrowDown')
        targetIndex = (index + lettersPerRow) % letters.length;
      else if (key === 'ArrowUp')
        targetIndex = (index - lettersPerRow + letters.length) % letters.length;
      else if (key === 'Home') targetIndex = 0;
      else if (key === 'End') targetIndex = letters.length - 1;
      if (targetIndex === null) return;
      event.preventDefault();
      const target = letterButtonRefs.current[targetIndex];
      target?.focus();
    },
    [letters.length, lettersPerRow],
  );
  useEffect(() => {
    window.addEventListener('keydown', keyHandler);
    return () => window.removeEventListener('keydown', keyHandler);
  }, [keyHandler]);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => (reduceMotionRef.current = mq.matches);
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);

  useEffect(() => {
    if (!word) return;
    if (paused || won || lost) return;
    const timer = window.setInterval(() => {
      setTimeLeft((value) => (value <= 1 ? 0 : value - 1));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [word, paused, won, lost]);

  useEffect(() => {
    if (!normalizedWord || paused || won || wrong >= MAX_PARTS || timeLeft > 0)
      return;
    for (let index = wrong; index < MAX_PARTS; index += 1) {
      partStartRef.current[index] = performance.now();
      partProgressRef.current[index] = reduceMotionRef.current ? 1 : 0;
    }
    setWrong(MAX_PARTS);
    setAnnouncement('Time is up! Press R to play again.');
  }, [normalizedWord, paused, won, wrong, timeLeft]);

  useEffect(() => {
    if (!normalizedWord) return;
    if (!won && wrong < MAX_PARTS && !timeExpired) return;
    logGameEnd('hangman', won ? 'win' : 'lose');
    const elapsed = Math.max(0, difficultySettings.duration - timeLeft);
    if (won) {
      confetti({ particleCount: 120, spread: 70, origin: { y: 0.6 } });
      setAnnouncement('Victory! Press R to play again.');
      setHintCoins(
        (value) => Math.max(value, difficultySettings.baseHints) + 1,
      );
    } else if (timeExpired) {
      setAnnouncement(`Time expired! The word was ${normalizedWord.toUpperCase()}.`);
    } else {
      setAnnouncement(
        `You lost! ${normalizedWord.toUpperCase()}. Press R to restart.`,
      );
    }
    setStats((previous) => {
      const existing = previous[dict] || {
        plays: 0,
        wins: 0,
        bestScore: 0,
        fastestWin: null,
        difficulties: {},
      };
      const difficultyBreakdown = existing.difficulties?.[difficulty] || {
        plays: 0,
        wins: 0,
        bestScore: 0,
        fastestWin: null,
      };
      const updatedDifficulty = {
        plays: difficultyBreakdown.plays + 1,
        wins: difficultyBreakdown.wins + (won ? 1 : 0),
        bestScore: Math.max(difficultyBreakdown.bestScore || 0, score),
        fastestWin: won
          ? difficultyBreakdown.fastestWin == null
            ? elapsed
            : Math.min(difficultyBreakdown.fastestWin, elapsed)
          : difficultyBreakdown.fastestWin,
      };
      const updated = {
        plays: existing.plays + 1,
        wins: existing.wins + (won ? 1 : 0),
        bestScore: Math.max(existing.bestScore || 0, score),
        fastestWin: won
          ? existing.fastestWin == null
            ? elapsed
            : Math.min(existing.fastestWin, elapsed)
          : existing.fastestWin,
        difficulties: {
          ...existing.difficulties,
          [difficulty]: updatedDifficulty,
        },
      };
      return { ...previous, [dict]: updated };
    });
    setHistory((previous) => {
      const entry = {
        id: Date.now(),
        outcome: won ? 'Win' : 'Loss',
        category: dict,
        difficulty,
        word: normalizedWord.toUpperCase(),
        score,
        timeElapsed: elapsed,
        timeRemaining: Math.max(0, timeLeft),
      };
      return [entry, ...previous].slice(0, 12);
    });
    if (score > highscore) setHighscore(score);
  }, [
    won,
    wrong,
    dict,
    normalizedWord,
    score,
    highscore,
    setHighscore,
    difficulty,
    difficultySettings.duration,
    difficultySettings.baseHints,
    timeLeft,
    setStats,
    setHistory,
    setHintCoins,
    timeExpired,
  ]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const paramDict = params.get('dict') || undefined;
    const paramWord = params.get('word') || undefined;
    const paramGuessed = params.get('guessed') || '';
    const paramWrong = parseInt(params.get('wrong') || '0', 10);
    const paramDifficulty = params.get('difficulty') || undefined;
    const paramTime = parseInt(params.get('time') || '-1', 10);
    const validDict =
      paramDict && DICTIONARIES[paramDict] ? paramDict : undefined;
    const validDifficulty =
      paramDifficulty && DIFFICULTY_CONFIG[paramDifficulty]
        ? paramDifficulty
        : undefined;
    if (validDifficulty && validDifficulty !== difficulty)
      setDifficulty(validDifficulty);
    if (paramWord) {
      const forcedWord = paramWord.toLowerCase();
      reset(forcedWord, validDict, validDifficulty);
      if (paramGuessed) setGuessed(paramGuessed.split('').filter(Boolean));
      if (!Number.isNaN(paramWrong))
        setWrong(Math.min(MAX_PARTS, Math.max(0, paramWrong)));
      const safeSettings = validDifficulty
        ? DIFFICULTY_CONFIG[validDifficulty]
        : difficultySettings;
      if (!Number.isNaN(paramTime) && paramTime >= 0)
        setTimeLeft(Math.min(safeSettings.duration, paramTime));
      partProgressRef.current = partProgressRef.current.map((_, index) =>
        index < Math.min(MAX_PARTS, Math.max(0, paramWrong)) ? 1 : 0,
      );
    } else if (validDict) {
      setPendingDict(validDict);
    } else if (!pendingDict && topics[0]) {
      setPendingDict(topics[0]);
    }
  }, [
    reset,
    setDifficulty,
    difficulty,
    difficultySettings,
    pendingDict,
    topics,
  ]);

  useEffect(() => {
    if (!normalizedWord) {
      setTimeLeft(difficultySettings.duration);
    }
  }, [difficultySettings.duration, normalizedWord]);
  const draw = useCallback(
    (ctx) => {
      ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
      ctx.fillStyle = '#0f0f0f';
      ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);

      ctx.lineWidth = 4;
      ctx.strokeStyle = '#fff';
      const now = performance.now();

      let gallowsProgress = gallowsProgressRef.current;
      if (gallowsProgress < 1) {
        const start = gallowsStartRef.current;
        gallowsProgress = reduceMotionRef.current
          ? 1
          : Math.min((now - start) / 600, 1);
        gallowsProgressRef.current = gallowsProgress;
      }

      drawLine(ctx, 20, 230, 180, 230, gallowsProgress);
      drawLine(ctx, 40, 20, 40, 230, gallowsProgress);
      drawLine(ctx, 40, 20, 120, 20, gallowsProgress);
      drawLine(ctx, 120, 20, 120, 40, gallowsProgress);

      HANGMAN_PARTS.forEach((segment, index) => {
        let progress = partProgressRef.current[index];
        if (index < wrong && progress < 1) {
          const start = partStartRef.current[index];
          progress = reduceMotionRef.current
            ? 1
            : Math.min((now - start) / 400, 1);
          partProgressRef.current[index] = progress;
        }
        if (progress > 0) segment(ctx, progress);
      });

      if (!normalizedWord) return;

      const characters = normalizedWord.split('');
      ctx.font = '20px monospace';
      ctx.fillStyle = '#fff';
      ctx.textAlign = 'center';
      characters.forEach((char, index) => {
        const x = 40 + index * 30;
        ctx.beginPath();
        ctx.moveTo(x, 210);
        ctx.lineTo(x + 20, 210);
        ctx.stroke();
        const revealed = guessed.includes(char) || lost;
        ctx.fillText(revealed ? char.toUpperCase() : '', x + 10, 195);
      });

      if (paused) {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
        ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
        ctx.fillStyle = '#fff';
        ctx.fillText('Paused', ctx.canvas.width / 2, 120);
      }

      if (won) {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
        ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
        ctx.fillStyle = SUCCESS_COLOR;
        ctx.fillText('You Won!', ctx.canvas.width / 2, 120);
      } else if (lost) {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
        ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
        ctx.fillStyle = FAILURE_COLOR;
        ctx.fillText(`You Lost! ${normalizedWord.toUpperCase()}`, ctx.canvas.width / 2, 120);
      }
    }, [normalizedWord, guessed, wrong, paused, won, lost]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const render = () => {
      draw(ctx);
      animationRef.current = requestAnimationFrame(render);
    };
    render();
    return () => cancelAnimationFrame(animationRef.current);
  }, [draw]);

  const bestScores = useMemo(() => {
    const winners = history.filter((entry) => entry.outcome === 'Win');
    winners.sort((a, b) => b.score - a.score || a.timeElapsed - b.timeElapsed);
    return winners.slice(0, 5);
  }, [history]);

  const recentHistory = useMemo(() => history.slice(0, 7), [history]);

  const dictionaryStats = stats[dict] || {};
  const difficultyStats = dictionaryStats.difficulties?.[difficulty] || {};
  const winRate = dictionaryStats.plays
    ? Math.round((dictionaryStats.wins / dictionaryStats.plays) * 100)
    : 0;
  const difficultyWinRate = difficultyStats.plays
    ? Math.round((difficultyStats.wins / difficultyStats.plays) * 100)
    : 0;
  const totalDuration = difficultySettings.duration;
  const safeTimeLeft = Math.min(timeLeft, totalDuration);
  const timerFraction = totalDuration
    ? Math.max(0, Math.min(1, safeTimeLeft / totalDuration))
    : 0;
  const dashOffset = RING_CIRCUMFERENCE * (1 - timerFraction);
  const ringColor =
    timerFraction < 0.2
      ? '#fb7185'
      : timerFraction < 0.5
      ? '#fbbf24'
      : '#38bdf8';
  const activeCategory = normalizedWord ? dict : pendingDict;
  const instructionsId = 'hangman-letter-grid-instructions';

  if (!normalizedWord) {
    return (
      <div className="flex flex-col gap-4 text-sm">
        <h2 className="text-lg font-semibold text-white">Hangman Challenge</h2>
        <div>
          <p className="mb-2 text-xs uppercase tracking-wide text-ubt-gray">
            Choose a category
          </p>
          <div className="flex flex-wrap gap-2">
            {topics.map((name) => {
              const active = name === pendingDict;
              return (
                <button
                  key={name}
                  type="button"
                  onClick={() => setPendingDict(name)}
                  className={`flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold transition ${
                    active
                      ? 'border-ubt-blue bg-ubt-blue/20 text-white shadow'
                      : 'border-slate-700 bg-black/40 text-ubt-gray hover:text-white'
                  }`}
                  aria-pressed={active}
                >
                  <span>{formatCategory(name)}</span>
                  <span className="text-[10px] uppercase tracking-wide text-ubt-gray">
                    {(DICTIONARIES[name] || []).length}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
        <div>
          <p className="mb-2 text-xs uppercase tracking-wide text-ubt-gray">
            Select difficulty
          </p>
          <div className="flex flex-wrap items-center gap-2">
            {Object.entries(DIFFICULTY_CONFIG).map(([key, config]) => {
              const active = key === difficulty;
              return (
                <div key={key} className="relative group">
                  <button
                    type="button"
                    onClick={() => handleDifficultyChange(key)}
                    className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
                      active
                        ? 'bg-ubt-blue text-black shadow'
                        : 'bg-slate-800 text-ubt-gray hover:bg-slate-700'
                    }`}
                    aria-pressed={active}
                  >
                    {config.label}
                  </button>
                  <div
                    role="tooltip"
                    className="pointer-events-none absolute z-10 mt-1 w-48 scale-95 rounded-lg bg-black/90 p-2 text-[11px] leading-snug text-ubt-gray opacity-0 shadow-lg transition group-hover:scale-100 group-hover:opacity-100 group-focus-within:scale-100 group-focus-within:opacity-100"
                  >
                    <p className="font-semibold text-white">{config.label}</p>
                    <p>{config.description}</p>
                    <p className="mt-1 flex items-center justify-between text-[10px] uppercase tracking-wide text-ubt-gray">
                      <span>⏱ {config.duration}s</span>
                      <span>💡 {config.baseHints} hints</span>
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-4 text-xs text-ubt-gray">
          <span>⏱ {difficultySettings.duration}s countdown</span>
          <span>💡 {difficultySettings.baseHints} hints</span>
          <span>⌨️ Press letters or use the on-screen grid.</span>
        </div>
        <button
          type="button"
          onClick={() => reset(undefined, pendingDict)}
          className="self-start rounded-lg bg-ubt-blue px-4 py-2 text-sm font-semibold text-black shadow focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ub-orange"
        >
          Start Game
        </button>
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-4">
      <header className="flex flex-wrap items-center justify-between gap-4 rounded-lg bg-black/20 p-3">
        <div className="flex items-center gap-4">
          <div
            className="relative h-16 w-16"
            role="img"
            aria-label={`${safeTimeLeft} seconds remaining`}
          >
            <svg viewBox="0 0 60 60" className="h-16 w-16">
              <circle
                cx="30"
                cy="30"
                r={RING_RADIUS}
                fill="transparent"
                stroke="rgba(148, 163, 184, 0.35)"
                strokeWidth="6"
              />
              <circle
                cx="30"
                cy="30"
                r={RING_RADIUS}
                fill="transparent"
                stroke={ringColor}
                strokeWidth="6"
                strokeLinecap="round"
                strokeDasharray={RING_CIRCUMFERENCE}
                strokeDashoffset={dashOffset}
                className="origin-center -rotate-90 transform transition-all duration-300 ease-out"
              />
            </svg>
            <span className="absolute inset-0 flex items-center justify-center text-xs font-semibold text-white">
              {safeTimeLeft}s
            </span>
          </div>
          <div className="text-xs leading-tight text-ubt-gray">
            <p className="font-semibold text-white">Score {score}</p>
            <p>High {highscore}</p>
            <p>
              Wrong {wrong}/{MAX_PARTS}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {Object.entries(DIFFICULTY_CONFIG).map(([key, config]) => {
            const active = key === difficulty;
            return (
              <div key={key} className="relative group">
                <button
                  type="button"
                  onClick={() => handleDifficultyChange(key)}
                  className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
                    active
                      ? 'bg-ubt-blue text-black shadow'
                      : 'bg-slate-800 text-ubt-gray hover:bg-slate-700'
                  }`}
                  aria-pressed={active}
                >
                  {config.label}
                </button>
                <div
                  role="tooltip"
                  className="pointer-events-none absolute right-0 top-full z-10 mt-1 w-48 scale-95 rounded-lg bg-black/90 p-2 text-[11px] leading-snug text-ubt-gray opacity-0 shadow-lg transition group-hover:scale-100 group-hover:opacity-100 group-focus-within:scale-100 group-focus-within:opacity-100"
                >
                  <p className="font-semibold text-white">{config.label}</p>
                  <p>{config.description}</p>
                  <p className="mt-1 flex items-center justify-between text-[10px] uppercase tracking-wide text-ubt-gray">
                    <span>⏱ {config.duration}s</span>
                    <span>💡 {config.baseHints} hints</span>
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </header>

      <div className="flex flex-wrap items-center gap-2 text-xs">
        <span className="uppercase tracking-wide text-ubt-gray">Categories:</span>
        {topics.map((name) => {
          const active = name === activeCategory;
          return (
            <button
              key={name}
              type="button"
              onClick={() => reset(undefined, name)}
              className={`flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold transition ${
                active
                  ? 'border-ubt-blue bg-ubt-blue/20 text-white shadow'
                  : 'border-slate-700 bg-black/40 text-ubt-gray hover:text-white'
              }`}
              aria-pressed={active}
            >
              <span>{formatCategory(name)}</span>
              <span className="text-[10px] uppercase tracking-wide text-ubt-gray">
                {(DICTIONARIES[name] || []).length}
              </span>
            </button>
          );
        })}
      </div>

      <div className="flex flex-wrap items-center gap-2 text-xs">
        <button
          type="button"
          onClick={handleHint}
          disabled={hintCoins <= 0 || paused || won || lost}
          className={`flex items-center gap-1 rounded-full px-3 py-1 font-semibold transition ${
            hintCoins <= 0 || paused || won || lost
              ? 'cursor-not-allowed bg-slate-700 text-slate-400'
              : 'bg-ub-orange text-black hover:bg-amber-400'
          }`}
        >
          💡 Hint ({hintCoins})
        </button>
        <button
          type="button"
          onClick={() => setHardMode((value) => !value)}
          className={`rounded-full px-3 py-1 font-semibold transition ${
            hardMode
              ? 'bg-red-500 text-black shadow'
              : 'bg-ubt-blue text-black hover:bg-ubt-blue/80'
          }`}
          aria-pressed={hardMode}
        >
          Hard Mode {hardMode ? 'On' : 'Off'}
        </button>
        <button
          type="button"
          onClick={() =>
            setFilterCommonLetters((value) => !value)
          }
          className={`rounded-full px-3 py-1 font-semibold transition ${
            filterCommonLetters
              ? 'bg-purple-600 text-white shadow'
              : 'bg-slate-800 text-ubt-gray hover:text-white'
          }`}
          aria-pressed={filterCommonLetters}
        >
          Rare Letters {filterCommonLetters ? 'On' : 'Off'}
        </button>
        <button
          type="button"
          onClick={togglePause}
          className="rounded-full bg-slate-800 px-3 py-1 font-semibold text-ubt-gray transition hover:text-white"
        >
          {paused ? 'Resume' : 'Pause'}
        </button>
        <button
          type="button"
          onClick={toggleSound}
          className={`rounded-full px-3 py-1 font-semibold transition ${
            sound
              ? 'bg-teal-500 text-black shadow'
              : 'bg-slate-800 text-ubt-gray hover:text-white'
          }`}
          aria-pressed={sound}
        >
          Sound {sound ? 'On' : 'Off'}
        </button>
        <button
          type="button"
          onClick={() => reset()}
          className="rounded-full bg-slate-800 px-3 py-1 font-semibold text-ubt-gray transition hover:text-white"
        >
          Reset
        </button>
        <button
          type="button"
          onClick={shareLink}
          className="rounded-full bg-ubt-green px-3 py-1 font-semibold text-black transition hover:bg-emerald-400"
        >
          Share Link
        </button>
        <button
          type="button"
          onClick={shareImage}
          className="rounded-full bg-ubt-blue px-3 py-1 font-semibold text-black transition hover:bg-ubt-blue/80"
        >
          Copy Snapshot
        </button>
      </div>

      <div className="text-xs text-ubt-gray">
        Stats for {formatCategory(dict)} · {dictionaryStats.wins || 0} wins /{' '}
        {dictionaryStats.plays || 0} plays ({winRate}% win rate) ·{' '}
        {DIFFICULTY_CONFIG[difficulty].label}:{' '}
        {difficultyStats.wins || 0}/{difficultyStats.plays || 0} wins ({
          difficultyWinRate
        }% ) · Best score {dictionaryStats.bestScore || 0}
        {dictionaryStats.fastestWin != null && (
          <span className="ml-2">
            Fastest win {dictionaryStats.fastestWin}s
          </span>
        )}
      </div>

      <div className="flex flex-col gap-6 lg:flex-row">
        <div className="flex flex-col items-center gap-4 lg:w-[420px]">
          <canvas
            ref={canvasRef}
            width={400}
            height={250}
            role="img"
            aria-label="Animated hangman drawing"
            className={`w-full max-w-md rounded-lg bg-ub-cool-grey shadow-lg ${
              lost ? 'grayscale' : ''
            }`}
          />
          <div
            className="flex flex-wrap items-end justify-center gap-2 font-mono text-xl"
            role="group"
            aria-label="Word progress"
          >
            {normalizedWord.split('').map((char, index) => {
              const revealed = guessed.includes(char) || lost;
              return (
                <div
                  key={`${char}-${index}`}
                  className="flex flex-col items-center transition-transform duration-300"
                >
                  <span
                    aria-hidden="true"
                    className={`flex h-9 min-w-[1.75rem] items-center justify-center rounded border-b-2 border-ubt-blue/50 px-2 text-lg transition-all duration-300 ease-out ${
                      revealed
                        ? 'translate-y-0 bg-ubt-blue/30 text-white shadow'
                        : 'translate-y-1 bg-black/30 text-transparent'
                    }`}
                  >
                    {char.toUpperCase()}
                  </span>
                  <span className="sr-only">
                    {revealed
                      ? `${char.toUpperCase()} revealed`
                      : 'Hidden letter'}
                  </span>
                </div>
              );
            })}
          </div>
          <p className="text-[11px] text-ubt-gray">
            Keyboard shortcuts: H for hint, P to pause, R to reset, S to toggle
            sound.
          </p>
        </div>

        <div className="flex-1 space-y-4">
          <section className="rounded-lg bg-black/30 p-3 shadow-inner">
            <h3 className="text-sm font-semibold text-white">Letter Grid</h3>
            <div
              role="grid"
              aria-describedby={instructionsId}
              className="mt-2 grid grid-cols-9 gap-1"
            >
              {letters.map((letter, index) => {
                const guessedAlready = guessed.includes(letter);
                const intensity =
                  frequencies.max > 0
                    ? frequencies.counts[letter] / frequencies.max
                    : 0;
                const tinted = guessedAlready
                  ? undefined
                  : `rgba(14, 165, 233, ${0.2 + intensity * 0.5})`;
                return (
                  <button
                    key={letter}
                    type="button"
                    onClick={() => handleGuess(letter)}
                    data-index={index}
                    onKeyDown={handleLetterGridNavigation}
                    disabled={guessedAlready || paused || won || lost}
                    aria-pressed={guessedAlready}
                    ref={(node) => {
                      letterButtonRefs.current[index] = node;
                    }}
                    className={`h-8 w-8 rounded text-sm font-semibold uppercase transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ub-orange ${
                      guessedAlready
                        ? 'cursor-not-allowed bg-slate-700 text-slate-400'
                        : 'text-white shadow-sm hover:brightness-110'
                    }`}
                    style={tinted ? { backgroundColor: tinted } : undefined}
                  >
                    {letter}
                  </button>
                );
              })}
            </div>
            <p
              id={instructionsId}
              className="mt-2 text-[11px] leading-relaxed text-ubt-gray"
            >
              Use arrow keys to move across letters and press Enter or Space to
              guess. Shortcuts: H=hint, P=pause, R=reset, S=sound.
            </p>
          </section>

          <section className="rounded-lg bg-black/30 p-3 shadow-inner">
            <h3 className="text-sm font-semibold text-white">Scoreboard</h3>
            {bestScores.length ? (
              <ul className="mt-2 space-y-1 text-xs font-mono">
                {bestScores.map((entry) => (
                  <li
                    key={`best-${entry.id}`}
                    className="flex items-center justify-between gap-2"
                  >
                    <span className="truncate text-ubt-green">
                      {entry.word}
                    </span>
                    <span className="flex-1 truncate text-ubt-gray">
                      {formatCategory(entry.category)} ·{' '}
                      {DIFFICULTY_CONFIG[entry.difficulty]?.label ||
                        formatCategory(entry.difficulty)}
                    </span>
                    <span className="text-white">{entry.score}</span>
                    <span className="text-ubt-gray">{entry.timeElapsed}s</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-2 text-[11px] text-ubt-gray">
                Win a round to populate the leaderboard.
              </p>
            )}
          </section>

          <section className="rounded-lg bg-black/30 p-3 shadow-inner">
            <h3 className="text-sm font-semibold text-white">Recent Games</h3>
            {recentHistory.length ? (
              <ul className="mt-2 max-h-40 space-y-1 overflow-y-auto pr-1 text-xs font-mono">
                {recentHistory.map((entry) => (
                  <li
                    key={entry.id}
                    className="flex items-center justify-between gap-2"
                  >
                    <span
                      className={`font-semibold ${
                        entry.outcome === 'Win'
                          ? 'text-ubt-green'
                          : 'text-ub-orange'
                      }`}
                    >
                      {entry.outcome}
                    </span>
                    <span className="flex-1 truncate text-ubt-gray">
                      {formatCategory(entry.category)} ·{' '}
                      {DIFFICULTY_CONFIG[entry.difficulty]?.label ||
                        formatCategory(entry.difficulty)}{' '}
                      · {entry.word}
                    </span>
                    <span className="text-ubt-gray">{entry.score}</span>
                    <span className="text-ubt-gray">{entry.timeElapsed}s</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-2 text-[11px] text-ubt-gray">
                Play a round to build your history.
              </p>
            )}
          </section>
        </div>
      </div>

      <div aria-live="polite" role="status" className="sr-only">
        {announcement}
      </div>
    </div>
  );
};

export default Hangman;
