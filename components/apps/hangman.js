import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import confetti from 'canvas-confetti';
import usePersistentState from '../../hooks/usePersistentState';
import usePrefersReducedMotion from '../../hooks/usePrefersReducedMotion';
import {
  logEvent,
  logGameStart,
  logGameEnd,
  logGameError,
} from '../../utils/analytics';
import { DICTIONARIES } from '../../apps/hangman/engine';
import { getGuessPool } from '../../apps/games/hangman/logic';

const CANVAS_WIDTH = 420;
const CANVAS_HEIGHT = 260;
const MAX_WRONG = 6;

const BG_COLOR = '#0b0f16';
const STROKE_COLOR = '#cbd5e1';
const TEXT_COLOR = '#e2e8f0';
const MUTED_TEXT = '#94a3b8';
const SUCCESS_COLOR = '#22c55e';
const FAILURE_COLOR = '#ef4444';

const PARTS = [
  (ctx) => {
    ctx.beginPath();
    ctx.arc(300, 90, 18, 0, Math.PI * 2);
    ctx.stroke();
  },
  (ctx) => {
    ctx.beginPath();
    ctx.moveTo(300, 108);
    ctx.lineTo(300, 160);
    ctx.stroke();
  },
  (ctx) => {
    ctx.beginPath();
    ctx.moveTo(300, 120);
    ctx.lineTo(275, 140);
    ctx.stroke();
  },
  (ctx) => {
    ctx.beginPath();
    ctx.moveTo(300, 120);
    ctx.lineTo(325, 140);
    ctx.stroke();
  },
  (ctx) => {
    ctx.beginPath();
    ctx.moveTo(300, 160);
    ctx.lineTo(282, 195);
    ctx.stroke();
  },
  (ctx) => {
    ctx.beginPath();
    ctx.moveTo(300, 160);
    ctx.lineTo(318, 195);
    ctx.stroke();
  },
];

const clamp = (n, min, max) => Math.max(min, Math.min(max, n));

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

const Hangman = () => {
  const prefersReducedMotion = usePrefersReducedMotion();
  const canvasRef = useRef(null);
  const audioCtxRef = useRef(null);
  const reduceMotionRef = useRef(false);
  const endKeyRef = useRef('');

  const gameStartAtRef = useRef(0);
  const wrongChangeAtRef = useRef(0);
  const lastWrongRef = useRef(0);

  const topics = useMemo(() => Object.keys(DICTIONARIES || {}), []);

  const [dict, setDict] = usePersistentState(
    'hangman-dict',
    topics[0] || 'default',
    (v) => typeof v === 'string',
  );
  const [word, setWord] = useState('');
  const [guessed, setGuessed] = useState([]);
  const [wrong, setWrong] = useState(0);
  const [score, setScore] = useState(0);
  const [highscore, setHighscore] = usePersistentState(
    'hangman-highscore',
    0,
    (v) => typeof v === 'number',
  );
  const [hintCoins, setHintCoins] = usePersistentState(
    'hangman-hint-coins',
    3,
    (v) => typeof v === 'number',
  );
  const [stats, setStats] = usePersistentState(
    'hangman-stats',
    {},
    (v) => v && typeof v === 'object',
  );
  const [paused, setPaused] = useState(false);
  const [announcement, setAnnouncement] = useState('');
  const [hardMode, setHardMode] = usePersistentState(
    'hangman-hard',
    false,
    (v) => typeof v === 'boolean',
  );
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
  const [error, setError] = useState('');

  const letters = useMemo(() => getGuessPool(filterCommon), [filterCommon]);

  const won = useMemo(() => {
    if (!word) return false;
    return word.split('').every((l) => guessed.includes(l));
  }, [word, guessed]);

  const lost = useMemo(() => wrong >= MAX_WRONG, [wrong]);

  useEffect(() => {
    reduceMotionRef.current = prefersReducedMotion;
  }, [prefersReducedMotion]);

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

  const reset = useCallback(
    (newWord, dictToUse = dict) => {
      try {
        const list =
          DICTIONARIES?.[dictToUse] ??
          DICTIONARIES?.[topics[0]] ??
          [];

        if (!Array.isArray(list) || list.length === 0) {
          setError('No words available for this category.');
          setWord('');
          setGuessed([]);
          setWrong(0);
          setScore(0);
          setAnnouncement('Unable to start: empty dictionary.');
          return;
        }

        const chosen =
          typeof newWord === 'string' && newWord.length
            ? newWord.toLowerCase()
            : String(list[Math.floor(Math.random() * list.length)] || '').toLowerCase();

        if (!chosen) {
          setError('Unable to pick a new word.');
          setWord('');
          setGuessed([]);
          setWrong(0);
          setScore(0);
          setAnnouncement('Unable to start: failed word selection.');
          return;
        }

        setError('');
        endKeyRef.current = '';
        const now = performance.now();
        gameStartAtRef.current = now;
        wrongChangeAtRef.current = now;
        lastWrongRef.current = 0;
        setWord(chosen);
        setGuessed([]);
        setWrong(0);
        setScore(0);
        setPaused(false);
        setAnnouncement('New game started.');
        logGameStart('hangman');
      } catch (err) {
        setError('Unable to start the game.');
        setAnnouncement('Unable to start the game.');
        logGameError('hangman', err?.message || String(err));
      }
    },
    [dict, topics],
  );

  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const w = params.get('word');
      const d = params.get('dict');
      if (typeof d === 'string' && DICTIONARIES[d]) {
        setDict(d);
      }
      if (typeof w === 'string' && w.length) {
        reset(w, d && DICTIONARIES[d] ? d : dict);
      }
    } catch {
      // ignore URL parsing errors
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!topics.length) return;
    if (!dict || !DICTIONARIES[dict]) {
      setDict(topics[0]);
    }
  }, [dict, setDict, topics]);

  useEffect(() => {
    if (!word) return;
    const now = performance.now();
    gameStartAtRef.current = now;
    wrongChangeAtRef.current = now;
    lastWrongRef.current = wrong;
  }, [word]);

  useEffect(() => {
    if (wrong === lastWrongRef.current) return;
    wrongChangeAtRef.current = performance.now();
    lastWrongRef.current = wrong;
  }, [wrong]);

  useEffect(() => {
    if (!word) return;
    if (!won && !lost) return;
    const key = `${dict}:${word}`;
    if (endKeyRef.current === key) return;
    endKeyRef.current = key;

    try {
      logGameEnd('hangman', won ? 'win' : 'lose');
      if (won) {
        setAnnouncement(`You won! The word was ${word}.`);
        if (!reduceMotionRef.current) {
          confetti({ particleCount: 90, spread: 70, origin: { y: 0.6 } });
        }
        setHintCoins((c) => c + 1);
      } else {
        setAnnouncement(`You lost. The word was ${word}.`);
      }

      setStats((prev) => {
        const next = { ...(prev || {}) };
        const entry = next[dict] || { plays: 0, wins: 0 };
        entry.plays += 1;
        if (won) entry.wins += 1;
        next[dict] = entry;
        return next;
      });

      if (score > highscore) {
        setHighscore(score);
      }
    } catch (err) {
      logGameError('hangman', err?.message || String(err));
    }
  }, [dict, won, lost, word, score, highscore, setHighscore, setHintCoins, setStats]);

  const handleGuess = useCallback(
    (letter) => {
      if (!word || paused || won || lost) return;
      const l = String(letter || '').toLowerCase();
      if (!letters.includes(l)) return;
      if (guessed.includes(l)) return;

      try {
        logEvent({ category: 'hangman', action: 'guess', label: l });

        const correct = word.includes(l);
        if (correct) {
          playTone(660);
          setScore((s) => s + 10);
          setGuessed((g) => [...g, l]);

          if (hardMode) {
            const list = DICTIONARIES[dict] || [];
            const filtered = list.filter((w) => !w.includes(l));
            if (filtered.length) {
              const newWord = filtered[Math.floor(Math.random() * filtered.length)];
              if (newWord && newWord !== word) {
                setWord(newWord);
                setGuessed([]);
                setWrong((w) => w + 1);
                setScore((s) => clamp(s - 5, 0, Number.MAX_SAFE_INTEGER));
                setAnnouncement('Hard mode: word shifted.');
                playTone(220);
              }
            }
          }
        } else {
          playTone(220);
          setWrong((w) => w + 1);
          setScore((s) => clamp(s - 2, 0, Number.MAX_SAFE_INTEGER));
          setGuessed((g) => [...g, l]);
        }
      } catch (err) {
        logGameError('hangman', err?.message || String(err));
      }
    },
    [dict, guessed, hardMode, letters, lost, paused, playTone, word, won],
  );

  const handleHint = useCallback(() => {
    if (!word || paused || won || lost) return;
    if (hintCoins <= 0) {
      setAnnouncement('No hint coins left.');
      return;
    }

    try {
      const remaining = word
        .split('')
        .filter((l) => !guessed.includes(l));
      if (!remaining.length) return;

      const vowels = new Set(['a', 'e', 'i', 'o', 'u']);
      const consonants = remaining.filter((l) => !vowels.has(l));
      const pool = consonants.length ? consonants : remaining;
      const unique = Array.from(new Set(pool));
      const reveal = unique[Math.floor(Math.random() * unique.length)];

      setHintCoins((c) => c - 1);
      setScore((s) => clamp(s - 5, 0, Number.MAX_SAFE_INTEGER));
      setAnnouncement(`Hint used: revealed '${reveal.toUpperCase()}'.`);
      handleGuess(reveal);
    } catch (err) {
      logGameError('hangman', err?.message || String(err));
    }
  }, [guessed, handleGuess, hintCoins, lost, paused, setHintCoins, word, won]);

  const togglePause = useCallback(() => {
    setPaused((p) => {
      const next = !p;
      setAnnouncement(next ? 'Paused. Press P to resume.' : 'Resumed.');
      return next;
    });
  }, []);

  const shareLink = useCallback(async () => {
    if (!word) return;
    try {
      const url = new URL(window.location.href);
      url.searchParams.set('word', word);
      url.searchParams.set('dict', dict);
      const ok = await safeClipboardWriteText(url.toString());
      setAnnouncement(ok ? 'Challenge link copied.' : 'Unable to copy the link.');
    } catch (err) {
      logGameError('hangman', err?.message || String(err));
      setAnnouncement('Unable to create challenge link.');
    }
  }, [dict, word]);

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
      a.download = `hangman-${dict}-${word}.png`;
      a.click();
      URL.revokeObjectURL(url);
      setAnnouncement('Image downloaded.');
    } catch (err) {
      logGameError('hangman', err?.message || String(err));
      setAnnouncement('Unable to share image.');
    }
  }, [dict, word]);

  const keyHandler = useCallback(
    (e) => {
      const target = e.target;
      const isInput =
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.isContentEditable);
      if (isInput) return;

      const k = e.key.toLowerCase();
      if (k === 'p') {
        e.preventDefault();
        togglePause();
        return;
      }
      if (k === 's') {
        e.preventDefault();
        setSound((v) => !v);
        return;
      }
      if (k === 'h') {
        e.preventDefault();
        handleHint();
        return;
      }
      if (k === 'r') {
        e.preventDefault();
        reset(undefined, dict);
        return;
      }
      if (letters.includes(k)) {
        e.preventDefault();
        handleGuess(k);
      }
    },
    [dict, handleGuess, handleHint, letters, reset, setSound, togglePause],
  );

  useEffect(() => {
    window.addEventListener('keydown', keyHandler);
    return () => window.removeEventListener('keydown', keyHandler);
  }, [keyHandler]);

  const frequencies = useMemo(() => {
    const list = Array.isArray(DICTIONARIES[dict]) ? DICTIONARIES[dict] : [];
    const counts = {};
    letters.forEach((l) => {
      counts[l] = 0;
    });
    list.forEach((w) => {
      if (typeof w !== 'string') return;
      w.split('').forEach((l) => {
        if (counts[l] !== undefined) counts[l] += 1;
      });
    });
    const max = Math.max(...Object.values(counts));
    const normalized = {};
    Object.keys(counts).forEach((l) => {
      normalized[l] = max > 0 ? counts[l] / max : 0;
    });
    return normalized;
  }, [dict, letters]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;
    const ctx = canvas.getContext('2d');
    if (!ctx) return undefined;

    let raf = 0;
    let cancelled = false;

    const drawLine = (x1, y1, x2, y2, progress) => {
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x1 + (x2 - x1) * progress, y1 + (y2 - y1) * progress);
      ctx.stroke();
    };

    const render = (t) => {
      if (cancelled) return;
      const elapsed = (t - (gameStartAtRef.current || t)) / 1000;
      const partElapsed = (t - (wrongChangeAtRef.current || t)) / 1000;

      ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
      ctx.fillStyle = BG_COLOR;
      ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

      ctx.strokeStyle = STROKE_COLOR;
      ctx.lineWidth = 5;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      const gallowsProgress = reduceMotionRef.current ? 1 : clamp(elapsed / 0.55, 0, 1);
      drawLine(100, 220, 250, 220, gallowsProgress);
      drawLine(150, 220, 150, 40, gallowsProgress);
      drawLine(150, 40, 300, 40, gallowsProgress);
      drawLine(300, 40, 300, 70, gallowsProgress);

      const shown = clamp(wrong, 0, PARTS.length);
      for (let i = 0; i < shown; i += 1) {
        const isLatest = i === shown - 1;
        const p = reduceMotionRef.current
          ? 1
          : clamp((isLatest ? partElapsed : 1) / 0.25, 0, 1);
        ctx.save();
        ctx.globalAlpha = p;
        ctx.setLineDash(reduceMotionRef.current || !isLatest ? [] : [8, 10]);
        PARTS[i](ctx);
        ctx.restore();
      }

      if (word) {
        const padX = 24;
        const usable = CANVAS_WIDTH - padX * 2;
        const len = word.length;
        const spacing = clamp(usable / Math.max(len, 1), 18, 34);
        const startX = (CANVAS_WIDTH - spacing * len) / 2 + spacing / 2;

        ctx.font = '18px monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        for (let i = 0; i < len; i += 1) {
          const x = startX + i * spacing;
          const y = 235;
          const l = word[i];
          const show = guessed.includes(l) || lost;
          ctx.fillStyle = show ? TEXT_COLOR : MUTED_TEXT;
          ctx.fillText(show ? l.toUpperCase() : '_', x, y);
        }
      }

      if (paused && !won && !lost) {
        ctx.fillStyle = 'rgba(0,0,0,0.6)';
        ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
        ctx.fillStyle = TEXT_COLOR;
        ctx.font = 'bold 22px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('PAUSED', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2);
      }

      if (won || lost) {
        ctx.fillStyle = won ? 'rgba(34,197,94,0.25)' : 'rgba(239,68,68,0.25)';
        ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
        ctx.fillStyle = won ? SUCCESS_COLOR : FAILURE_COLOR;
        ctx.font = 'bold 22px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(won ? 'YOU WIN' : 'GAME OVER', CANVAS_WIDTH / 2, 36);
      }

      raf = requestAnimationFrame(render);
    };

    raf = requestAnimationFrame(render);
    return () => {
      cancelled = true;
      if (raf) cancelAnimationFrame(raf);
    };
  }, [dict, guessed, lost, paused, word, won, wrong]);

  const dictStats = stats && typeof stats === 'object' ? stats[dict] : null;
  const plays = dictStats?.plays || 0;
  const wins = dictStats?.wins || 0;
  const winRate = plays ? Math.round((wins / plays) * 100) : 0;

  const startLabel = word ? 'New word' : 'Start';

  return (
    <div className="h-full w-full flex flex-col bg-ub-cool-grey text-white">
      <div className="flex flex-wrap items-center gap-2 p-2">
        <label className="flex items-center gap-2">
          <span className="text-sm text-gray-200">Category</span>
          <select
            className="rounded bg-gray-800 px-2 py-1 text-sm text-white border border-gray-700 focus:outline-none focus:ring"
            value={dict}
            onChange={(e) => {
              const next = e.target.value;
              setDict(next);
              reset(undefined, next);
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

        <button
          className="rounded bg-gray-700 px-3 py-1 text-sm hover:bg-gray-600 focus:outline-none focus:ring disabled:opacity-50"
          onClick={() => reset(undefined, dict)}
          type="button"
          aria-label={startLabel}
          disabled={!topics.length}
        >
          {startLabel}
        </button>

        <button
          className="rounded bg-gray-700 px-3 py-1 text-sm hover:bg-gray-600 focus:outline-none focus:ring disabled:opacity-50"
          onClick={togglePause}
          type="button"
          aria-pressed={paused}
          aria-label={paused ? 'Resume' : 'Pause'}
          disabled={!word || won || lost}
        >
          {paused ? 'Resume' : 'Pause'}
        </button>

        <button
          className="rounded bg-gray-700 px-3 py-1 text-sm hover:bg-gray-600 focus:outline-none focus:ring disabled:opacity-50"
          onClick={handleHint}
          type="button"
          disabled={!word || paused || won || lost || hintCoins <= 0}
          aria-label="Use hint"
          title="Hint (H). Costs 1 coin and 5 points."
        >
          Hint ({hintCoins})
        </button>

        <button
          className="rounded bg-gray-700 px-3 py-1 text-sm hover:bg-gray-600 focus:outline-none focus:ring"
          onClick={() => setSound((v) => !v)}
          type="button"
          aria-pressed={sound}
          aria-label={sound ? 'Sound on' : 'Sound off'}
          title="Toggle sound (S)"
        >
          {sound ? 'Sound: On' : 'Sound: Off'}
        </button>

        <button
          className="rounded bg-gray-700 px-3 py-1 text-sm hover:bg-gray-600 focus:outline-none focus:ring"
          onClick={() => setHardMode((h) => !h)}
          type="button"
          aria-pressed={hardMode}
          aria-label={hardMode ? 'Hard mode on' : 'Hard mode off'}
          title="Hard mode swaps the word after some correct guesses."
        >
          {hardMode ? 'Hard: On' : 'Hard: Off'}
        </button>

        <button
          className="rounded bg-gray-700 px-3 py-1 text-sm hover:bg-gray-600 focus:outline-none focus:ring"
          onClick={() => setFilterCommon((f) => !f)}
          type="button"
          aria-pressed={filterCommon}
          aria-label={
            filterCommon ? 'Exclude common letters on' : 'Exclude common letters off'
          }
          title="Exclude common letters from the keyboard"
        >
          {filterCommon ? 'Exclude common: On' : 'Exclude common: Off'}
        </button>

        <button
          className="rounded bg-gray-700 px-3 py-1 text-sm hover:bg-gray-600 focus:outline-none focus:ring disabled:opacity-50"
          onClick={shareLink}
          type="button"
          disabled={!word}
          aria-label="Copy challenge link"
        >
          Copy link
        </button>

        <button
          className="rounded bg-gray-700 px-3 py-1 text-sm hover:bg-gray-600 focus:outline-none focus:ring disabled:opacity-50"
          onClick={shareImage}
          type="button"
          disabled={!word}
          aria-label="Copy game image"
        >
          Copy image
        </button>
      </div>

      <div className="px-2 pb-1 text-xs text-gray-200">
        <span className="mr-3">
          Score: <span className="text-white">{score}</span>
        </span>
        <span className="mr-3">
          High: <span className="text-white">{highscore}</span>
        </span>
        <span className="mr-3">
          Wrong: <span className="text-white">{wrong}/{MAX_WRONG}</span>
        </span>
        <span className="mr-3">
          Coins: <span className="text-white">{hintCoins}</span>
        </span>
        <span className="mr-3">
          {dict.toUpperCase()} win rate: <span className="text-white">{winRate}%</span> ({wins}/{plays})
        </span>
        <span className="text-gray-400">Keys: A-Z guess, H hint, R restart, P pause</span>
      </div>

      {error && (
        <div className="px-2 pb-2 text-sm text-red-300" role="alert">
          {error}
        </div>
      )}

      <div className="sr-only" aria-live="polite" role="status">
        {announcement}
      </div>

      {announcement && (
        <div className="px-2 pb-2 text-sm text-gray-200" aria-live="polite" role="status">
          {announcement}
        </div>
      )}

      {!word ? (
        <div className="flex-1 flex items-center justify-center text-gray-200">
          <div className="max-w-md text-center px-4">
            <div className="text-lg font-mono">Hangman</div>
            <div className="mt-2 text-sm text-gray-300">
              Pick a category, then click Start. Type letters or click the keyboard.
            </div>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex flex-col">
          <div className="flex justify-center px-2">
            <canvas
              ref={canvasRef}
              width={CANVAS_WIDTH}
              height={CANVAS_HEIGHT}
              className="bg-black w-full max-w-[520px] h-auto rounded border border-gray-700"
              role="img"
              aria-label="Hangman game board"
            />
          </div>

          <div className="mt-3 px-2 flex-1 overflow-auto">
            <div className="grid grid-cols-9 gap-1 max-w-[520px] mx-auto">
              {letters.map((l) => {
                const used = guessed.includes(l);
                const correct = used && word.includes(l);
                const intensity = frequencies[l] ?? 0;
                const bg = used
                  ? correct
                    ? 'rgba(34,197,94,0.55)'
                    : 'rgba(239,68,68,0.55)'
                  : `rgba(56,189,248,${0.10 + intensity * 0.35})`;

                return (
                  <button
                    key={l}
                    type="button"
                    onClick={() => handleGuess(l)}
                    disabled={!word || paused || won || lost || used}
                    aria-label={`Guess ${l.toUpperCase()}${used ? ' (used)' : ''}`}
                    className="rounded px-2 py-1 text-sm font-mono border border-gray-700 hover:border-gray-500 focus:outline-none focus:ring disabled:opacity-60"
                    style={{ backgroundColor: bg }}
                  >
                    {l.toUpperCase()}
                  </button>
                );
              })}
            </div>

            {(won || lost) && (
              <div className="mt-4 text-center">
                <div className={`text-lg font-mono ${won ? 'text-green-300' : 'text-red-300'}`}>
                  {won ? 'You won!' : 'You lost'}
                </div>
                <div className="mt-1 text-sm text-gray-200">
                  Word: <span className="font-mono text-white">{word.toUpperCase()}</span>
                </div>
                <div className="mt-3 flex items-center justify-center gap-2">
                  <button
                    type="button"
                    className="rounded bg-gray-700 px-3 py-1 text-sm hover:bg-gray-600 focus:outline-none focus:ring"
                    onClick={() => reset(undefined, dict)}
                  >
                    Play again
                  </button>
                  <button
                    type="button"
                    className="rounded bg-gray-700 px-3 py-1 text-sm hover:bg-gray-600 focus:outline-none focus:ring"
                    onClick={shareImage}
                  >
                    Share image
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Hangman;
