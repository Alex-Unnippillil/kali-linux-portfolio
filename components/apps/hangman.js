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

const isStringArray = (value) =>
  Array.isArray(value) && value.every((item) => typeof item === 'string');

const isDifficulty = (value) =>
  typeof value === 'string' && Object.keys(DIFFICULTY_PRESETS).includes(value);

const Hangman = () => {
  const prefersReducedMotion = usePrefersReducedMotion();
  const canvasRef = useRef(null);
  const canvasWrapRef = useRef(null);
  const audioCtxRef = useRef(null);
  const reduceMotionRef = useRef(false);
  const endKeyRef = useRef('');

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
  const [showHelp, setShowHelp] = useState(false);
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

  useEffect(() => {
    if (game.status !== 'won' && game.status !== 'lost') return;
    const key = `${game.category}:${game.word}:${game.status}`;
    if (endKeyRef.current === key) return;
    endKeyRef.current = key;

    try {
      logGameEnd('hangman', game.status === 'won' ? 'win' : 'lose');
      if (game.status === 'won') {
        setAnnouncement(`You won! The phrase was ${game.word}.`);
        if (!reduceMotionRef.current) {
          confetti({ particleCount: 90, spread: 70, origin: { y: 0.6 } });
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

      if (game.score > highscore) {
        setHighscore(game.score);
      }
    } catch (err) {
      logGameError('hangman', err?.message || String(err));
    }
  }, [game, highscore, setHighscore, setStats]);

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

  const startNewGame = useCallback(
    ({ category, word, difficulty: nextDifficulty } = {}) => {
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
        const nextGame = newGame({
          category: nextCategory,
          word,
          dictionaries,
          difficulty: difficultyToUse,
          seed: Date.now(),
        });
        setGame(nextGame);
        setAnnouncement('New game started.');
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
      const d = params.get('dict');
      if (typeof d === 'string' && dictionaries[d]) {
        setDict(d);
      }
      if (typeof w === 'string' && w.length) {
        startNewGame({
          word: w,
          category: d && dictionaries[d] ? d : dict,
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
      return next;
    });
  }, []);

  const shareLink = useCallback(async () => {
    if (!game.word) return;
    try {
      const url = new URL(window.location.href);
      url.searchParams.set('word', game.word);
      url.searchParams.set('dict', dict);
      const ok = await safeClipboardWriteText(url.toString());
      setAnnouncement(ok ? 'Challenge link copied.' : 'Unable to copy the link.');
    } catch (err) {
      logGameError('hangman', err?.message || String(err));
      setAnnouncement('Unable to create challenge link.');
    }
  }, [dict, game.word]);

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
      `Imported ${result.words.length} word${
        result.words.length === 1 ? '' : 's'
      }${result.truncated ? ' (trimmed to 200 entries).' : '.'}`,
    );
    setDict('custom');
    setAnnouncement('Custom list imported. Ready to play.');
  }, [customDraft, setCustomWords, setDict]);

  const clearCustom = useCallback(() => {
    setCustomWords([]);
    setCustomDraft('');
    setCustomStatus('Custom list cleared.');
    setAnnouncement('Custom list cleared.');
  }, [setCustomWords]);

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
        startNewGame({ category: dict });
        return;
      }
      if (letters.includes(k)) {
        e.preventDefault();
        handleGuess(k);
      }
    },
    [dict, handleGuess, handleHint, letters, setSound, startNewGame, togglePause],
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
  const startLabel = game.word ? 'New game' : 'Start';
  const isPlaying = game.status === 'playing';
  const won = isWin(game);
  const lost = isLose(game);

  return (
    <div className="h-full w-full flex flex-col bg-[#0b0f16] text-slate-100">
      <div className="flex flex-wrap items-center gap-2 p-2 border-b border-slate-800 bg-[#0e1624]">
        <label className="flex items-center gap-2">
          <span className="text-xs uppercase tracking-wide text-slate-300">
            Category
          </span>
          <select
            className="rounded bg-slate-900 px-2 py-1 text-sm text-slate-100 border border-slate-700 focus:outline-none focus:ring focus:ring-cyan-500"
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
          <span className="text-xs uppercase tracking-wide text-slate-300">
            Difficulty
          </span>
          <select
            className="rounded bg-slate-900 px-2 py-1 text-sm text-slate-100 border border-slate-700 focus:outline-none focus:ring focus:ring-cyan-500"
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
          className="rounded bg-slate-800 px-3 py-1 text-sm hover:bg-slate-700 focus:outline-none focus:ring focus:ring-cyan-500 disabled:opacity-50"
          onClick={() => startNewGame({ category: dict })}
          type="button"
          aria-label={startLabel}
          disabled={!topics.length}
        >
          {startLabel}
        </button>

        <button
          className="rounded bg-slate-800 px-3 py-1 text-sm hover:bg-slate-700 focus:outline-none focus:ring focus:ring-cyan-500 disabled:opacity-50"
          onClick={togglePause}
          type="button"
          aria-pressed={paused}
          aria-label={paused ? 'Resume' : 'Pause'}
          disabled={!game.word || won || lost}
        >
          {paused ? 'Resume' : 'Pause'}
        </button>

        <button
          className="rounded bg-slate-800 px-3 py-1 text-sm hover:bg-slate-700 focus:outline-none focus:ring focus:ring-cyan-500 disabled:opacity-50"
          onClick={handleHint}
          type="button"
          disabled={!game.word || paused || won || lost || game.hintsRemaining <= 0}
          aria-label="Use hint"
          title={`Hint (H). Costs ${game.hintCost} points.`}
        >
          Hint ({game.hintsRemaining})
        </button>

        <button
          className="rounded bg-slate-800 px-3 py-1 text-sm hover:bg-slate-700 focus:outline-none focus:ring focus:ring-cyan-500"
          onClick={() => setSound((v) => !v)}
          type="button"
          aria-pressed={sound}
          aria-label={sound ? 'Sound on' : 'Sound off'}
          title="Toggle sound (S)"
        >
          {sound ? 'Sound: On' : 'Sound: Off'}
        </button>

        <button
          className="rounded bg-slate-800 px-3 py-1 text-sm hover:bg-slate-700 focus:outline-none focus:ring focus:ring-cyan-500"
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
          className="rounded bg-slate-800 px-3 py-1 text-sm hover:bg-slate-700 focus:outline-none focus:ring focus:ring-cyan-500 disabled:opacity-50"
          onClick={shareLink}
          type="button"
          disabled={!game.word}
          aria-label="Copy challenge link"
        >
          Copy link
        </button>

        <button
          className="rounded bg-slate-800 px-3 py-1 text-sm hover:bg-slate-700 focus:outline-none focus:ring focus:ring-cyan-500 disabled:opacity-50"
          onClick={shareImage}
          type="button"
          disabled={!game.word}
          aria-label="Copy game image"
        >
          Copy image
        </button>

        <button
          className="rounded bg-slate-800 px-3 py-1 text-sm hover:bg-slate-700 focus:outline-none focus:ring focus:ring-cyan-500"
          onClick={() => setShowHelp((prev) => !prev)}
          type="button"
          aria-expanded={showHelp}
          aria-controls="hangman-help"
        >
          Shortcuts
        </button>
      </div>

      {showHelp && (
        <div
          id="hangman-help"
          className="mx-2 mt-2 rounded border border-slate-800 bg-[#0f1b2d] px-3 py-2 text-xs text-slate-200"
        >
          <div className="font-semibold text-slate-100">Keyboard shortcuts</div>
          <div className="mt-1 grid gap-1 sm:grid-cols-2">
            <span>A-Z: Guess</span>
            <span>H: Hint</span>
            <span>R: New game</span>
            <span>P: Pause/Resume</span>
            <span>S: Sound toggle</span>
          </div>
        </div>
      )}

      <div className="px-2 pb-2 text-xs text-slate-200">
        <span className="mr-3">
          Score: <span className="text-white">{game.score}</span>
        </span>
        <span className="mr-3">
          High: <span className="text-white">{highscore}</span>
        </span>
        <span className="mr-3">
          Wrong: <span className="text-white">{game.wrong}/{maxWrong}</span>
        </span>
        <span className="mr-3">
          Hints: <span className="text-white">{game.hintsRemaining}</span> (cost {game.hintCost} pts)
        </span>
        <span className="mr-3">
          Remaining letters: <span className="text-white">{remainingLetters}</span>
        </span>
        <span className="mr-3">
          {dict.toUpperCase()} win rate: <span className="text-white">{winRate}%</span> ({wins}/{plays})
        </span>
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
        <div className="px-2 pb-2 text-sm text-slate-200" aria-live="polite" role="status">
          {announcement}
        </div>
      )}

      <div className="px-2 pb-2">
        <div className="rounded border border-slate-800 bg-[#0f1827] p-3">
          <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <div>
              <div className="text-xs uppercase tracking-wide text-slate-400">
                Custom word list
              </div>
              <div className="text-xs text-slate-300">
                Paste words or short phrases (letters, spaces, hyphens). One per line.
              </div>
            </div>
            <div className="text-xs text-slate-400">
              {customWords.length ? `${customWords.length} saved` : 'No custom list yet'}
            </div>
          </div>
          <textarea
            className="mt-2 h-24 w-full rounded border border-slate-700 bg-slate-900 p-2 text-xs text-slate-100 focus:outline-none focus:ring focus:ring-cyan-500"
            placeholder="e.g. red moon\nblue-sky\nstar wars"
            value={customDraft}
            onChange={(e) => setCustomDraft(e.target.value)}
            aria-label="Custom word list"
          />
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <button
              type="button"
              className="rounded bg-slate-800 px-3 py-1 text-xs hover:bg-slate-700 focus:outline-none focus:ring focus:ring-cyan-500"
              onClick={handleImport}
            >
              Import list
            </button>
            <button
              type="button"
              className="rounded bg-slate-800 px-3 py-1 text-xs hover:bg-slate-700 focus:outline-none focus:ring focus:ring-cyan-500"
              onClick={clearCustom}
              disabled={!customWords.length}
            >
              Clear list
            </button>
            <button
              type="button"
              className="rounded bg-slate-800 px-3 py-1 text-xs hover:bg-slate-700 focus:outline-none focus:ring focus:ring-cyan-500"
              onClick={() => startNewGame({ category: 'custom' })}
              disabled={!customWords.length}
            >
              Play custom
            </button>
            {customStatus && (
              <span className="text-xs text-slate-300">{customStatus}</span>
            )}
          </div>
        </div>
      </div>

      {!game.word ? (
        <div className="flex-1 flex items-center justify-center text-slate-200">
          <div className="max-w-md text-center px-4">
            <div className="text-lg font-mono">Hangman</div>
            <div className="mt-2 text-sm text-slate-300">
              Pick a category, then click Start. Type letters or tap the keyboard.
            </div>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex flex-col">
          <div className="flex justify-center px-2">
            <div
              ref={canvasWrapRef}
              className="w-full max-w-[560px] aspect-[21/13] rounded border border-slate-800 bg-black"
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
              <div className="rounded border border-slate-800 bg-[#0f1b2d] px-3 py-2 text-center">
                <div className="text-xs uppercase tracking-wide text-slate-400">Phrase</div>
                <div
                  className="mt-1 font-mono text-lg tracking-[0.2em] text-white"
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
                      className="rounded px-2 py-2 text-sm font-mono border border-slate-700 hover:border-slate-500 focus:outline-none focus:ring focus:ring-cyan-500 disabled:opacity-60"
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
                    className={`text-lg font-mono ${
                      won ? 'text-green-300' : 'text-red-300'
                    }`}
                  >
                    {won ? 'You won!' : 'You lost'}
                  </div>
                  <div className="mt-1 text-sm text-slate-200">
                    Phrase:{' '}
                    <span className="font-mono text-white">
                      {game.word.toUpperCase()}
                    </span>
                  </div>
                  <div className="mt-3 flex items-center justify-center gap-2">
                    <button
                      type="button"
                      className="rounded bg-slate-800 px-3 py-1 text-sm hover:bg-slate-700 focus:outline-none focus:ring focus:ring-cyan-500"
                      onClick={() => startNewGame({ category: dict })}
                    >
                      Play again
                    </button>
                    <button
                      type="button"
                      className="rounded bg-slate-800 px-3 py-1 text-sm hover:bg-slate-700 focus:outline-none focus:ring focus:ring-cyan-500"
                      onClick={shareImage}
                    >
                      Share image
                    </button>
                  </div>
                </div>
              )}

              {isPlaying && game.hintsRemaining > 0 && (
                <div className="mt-3 text-xs text-slate-400">
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
