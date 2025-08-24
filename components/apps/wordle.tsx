import React, { useState, useEffect, useCallback } from 'react';
import {
  WORDS_BY_DIFFICULTY,
  ALL_GUESSES,
  getAnswer,
  Difficulty,
} from '../../apps/wordle/words';
import { loadState, saveState } from '../../lib/idb';


const ROWS = 6;
const COLS = 5;

const evaluateGuess = (guess: string, answer: string) => {
  const res: ('correct' | 'present' | 'absent')[] = Array(COLS).fill('absent');
  const ans = answer.split('');
  const used = Array(COLS).fill(false);
  for (let i = 0; i < COLS; i++) {
    if (guess[i] === ans[i]) {
      res[i] = 'correct';
      used[i] = true;
    }
  }
  for (let i = 0; i < COLS; i++) {
    if (res[i] === 'correct') continue;
    const idx = ans.findIndex((ch, j) => !used[j] && ch === guess[i]);
    if (idx !== -1) {
      res[i] = 'present';
      used[idx] = true;
    }
  }
  return res;
};

type Settings = {
  hardMode: boolean;
  colorBlind: boolean;
  reducedMotion: boolean;
  mode: 'daily' | 'infinite';
};

type Stats = { played: number; wins: number; streak: number; maxStreak: number };

const defaultSettings: Settings = {
  hardMode: false,
  colorBlind: false,
  reducedMotion: false,
  mode: 'daily',
};

const defaultStats: Stats = { played: 0, wins: 0, streak: 0, maxStreak: 0 };

const Keyboard = ({
  onKey,
  keyStatuses,
  colorBlind,

}: {
  onKey: (k: string) => void;
  keyStatuses: Record<string, string>;
  colorBlind: boolean;

}) => {
  const rows = ['QWERTYUIOP', 'ASDFGHJKL', 'ZXCVBNM'];
  const getKeyClass = (k: string) => {
    const status = keyStatuses[k];
    if (status === 'correct') return colorBlind ? 'bg-blue-600' : 'bg-green-600';
    if (status === 'present') return colorBlind ? 'bg-orange-500' : 'bg-yellow-500';
    if (status === 'absent') return 'bg-gray-700';
    return 'bg-gray-500';
  };
  const motionCls = reducedMotion ? 'transition-none' : 'transition-colors';
  return (
    <div className="space-y-1 mt-4">
      {rows.map((row, i) => (
        <div key={row} className="flex justify-center space-x-1">
          {i === 2 && (
            <button
              className={`px-3 py-2 rounded text-sm bg-gray-500 ${motionCls}`}
              onClick={() => onKey('ENTER')}
              aria-label="enter"
            >
              Enter
            </button>
          )}
          {row.split('').map((ch) => (
            <button
              key={ch}
              className={`w-8 h-10 rounded text-sm ${getKeyClass(
                ch,
              )} ${motionCls}`}
              onClick={() => onKey(ch)}
              aria-label={`letter ${ch}`}
            >
              {ch}
            </button>
          ))}
          {i === 2 && (
            <button
              className={`px-3 py-2 rounded text-sm bg-gray-500 ${motionCls}`}
              onClick={() => onKey('BACKSPACE')}
              aria-label="backspace"
            >
              ⌫
            </button>
          )}
        </div>
      ))}
    </div>
  );
};

const difficulties = Object.keys(WORDS_BY_DIFFICULTY) as Difficulty[];

const Wordle = () => {
  const [difficulty, setDifficulty] = useState<Difficulty>('easy');
  const [answer, setAnswer] = useState('');

  const [guesses, setGuesses] = useState<string[]>([]);
  const [statuses, setStatuses] = useState<string[][]>([]);
  const [current, setCurrent] = useState('');
  const [message, setMessage] = useState('');
  const [gameOver, setGameOver] = useState(false);
  const [keyStatuses, setKeyStatuses] = useState<Record<string, string>>({});
  const [hints, setHints] = useState(3);
  const [streak, setStreak] = useState(0);
  const [colorBlind, setColorBlind] = useState(false);

  useEffect(() => {
    loadState('wordle').then((data) => {
      if (!data) return;
      setGuesses(data.guesses || []);
      setStatuses(data.statuses || []);
      setCurrent(data.current || '');
      setHardMode(data.hardMode || false);
      setMessage(data.message || '');
      setGameOver(data.gameOver || false);
      setKeyStatuses(data.keyStatuses || {});
      setHints(data.hints ?? 3);
      setStreak(data.streak ?? 0);
      setColorBlind(data.colorBlind || false);
      setDifficulty(data.difficulty || 'easy');
    });
  }, []);

  useEffect(() => {
    setAnswer(getAnswer(difficulty));
  }, [difficulty]);

  useEffect(() => {
    saveState('wordle', {
      guesses,
      statuses,
      current,
      hardMode,
      message,
      gameOver,
      keyStatuses,
      hints,
      streak,
      colorBlind,
      difficulty,
    });
  }, [
    guesses,
    statuses,
    current,
    hardMode,
    message,
    gameOver,
    keyStatuses,
    hints,
    streak,
    colorBlind,
    difficulty,
  ]);


  const checkHardMode = useCallback(
    (g: string) => {
      if (!settings.hardMode) return true;
      for (let r = 0; r < statuses.length; r++) {
        const s = statuses[r];
        const word = guesses[r];
        for (let i = 0; i < COLS; i++) {
          if (s[i] === 'correct' && g[i] !== word[i]) return false;
          if (s[i] === 'present' && !g.includes(word[i])) return false;
        }
      }
      return true;
    },
    [settings.hardMode, statuses, guesses],
  );

  const submitGuess = useCallback(() => {
    if (current.length !== COLS) return setMessage('Word must be 5 letters');
    const lower = current.toLowerCase();
    if (!ALL_GUESSES.includes(lower)) return setMessage('Word not in list');

    if (!checkHardMode(lower)) return setMessage('Use revealed hints');

    const evals = evaluateGuess(lower, answer);
    const newGuesses = [...guesses, lower];
    const newStatuses = [...statuses, evals];
    setGuesses(newGuesses);
    setStatuses(newStatuses);
    setCurrent('');
    setMessage('');

    setKeyStatuses((prev) => {
      const next = { ...prev } as Record<string, string>;
      lower.split('').forEach((ch, i) => {
        const st = evals[i];
        const prevSt = next[ch.toUpperCase()];
        if (prevSt === 'correct') return;
        if (prevSt === 'present' && st === 'absent') return;
        next[ch.toUpperCase()] = st;
      });
      return next;
    });

    setCandidates(filterCandidates(newGuesses, newStatuses));

    if (lower === answer) {
      setGameOver(true);
      setMessage('You solved it!');
      setStreak((s) => s + 1);
    } else if (guesses.length + 1 === ROWS) {
      setGameOver(true);
      setMessage(`Word was ${answer.toUpperCase()}`);
      setStreak(0);

    }
  }, [
    current,
    guesses,
    statuses,
    answer,
    checkHardMode,
    filterCandidates,
    stats,
  ]);

  const handleKey = useCallback(
    (k: string) => {
      if (gameOver) return;
      if (k === 'ENTER') {
        submitGuess();
      } else if (k === 'BACKSPACE') {
        setCurrent((c) => c.slice(0, -1));
      } else if (/^[A-Z]$/.test(k)) {
        setCurrent((c) => (c.length < COLS ? c + k : c));
      }
    },
    [gameOver, submitGuess],
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const key = e.key.toUpperCase();
      handleKey(key === 'BACKSPACE' ? 'BACKSPACE' : key);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [handleKey]);

  const useHint = () => {
    if (hints <= 0 || gameOver) return;
    const unrevealed: number[] = [];
    for (let i = 0; i < COLS; i++) {
      if (!guesses.some((g) => g[i] === answer[i])) unrevealed.push(i);
    }
    if (!unrevealed.length) return;
    const idx = unrevealed[Math.floor(Math.random() * unrevealed.length)];
    setCurrent((c) => {
      const arr = c.toUpperCase().padEnd(COLS).split('');
      arr[idx] = answer[idx].toUpperCase();
      return arr.join('').trimEnd();
    });
    setHints(hints - 1);
  };

  const getCellClass = (status?: string) => {
    let cls =
      'w-12 h-12 border-2 flex items-center justify-center text-xl font-bold';
    if (status === 'correct')
      cls += colorBlind
        ? ' bg-blue-600 border-blue-600'
        : ' bg-green-600 border-green-600';
    else if (status === 'present')
      cls += colorBlind
        ? ' bg-orange-500 border-orange-500'
        : ' bg-yellow-500 border-yellow-500';
    else if (status === 'absent') cls += ' bg-gray-700 border-gray-700';
    else cls += ' border-gray-500';
    return cls;
  };

  const share = () => {
    const grid = statuses
      .map((row) =>
        row
          .map((s) =>
            s === 'correct'
              ? colorBlind
                ? '\uD83D\uDFE6'
                : '\uD83D\uDFE9'
              : s === 'present'
              ? colorBlind
                ? '\uD83D\uDFE7'
                : '\uD83D\uDFE8'
              : '\u2B1B',
          )
          .join(''),
      )
      .join('\n');
    const text = `Puzzle ${new Date()
      .toISOString()
      .slice(0, 10)}\n${grid}`;
    navigator.clipboard
      .writeText(text)
      .then(() => setMessage('Copied results'))
      .catch(() => setMessage('Copy failed'));
  };

  const exportReplay = () => {
    const data = { mode: settings.mode, answer, guesses, statuses };
    const blob = new Blob([JSON.stringify(data)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'wordle-replay.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  const getTileClass = (status?: string) => {
    const base = `w-12 h-12 border-2 flex items-center justify-center text-xl font-bold ${
      settings.reducedMotion ? 'transition-none' : ''
    }`;
    if (status === 'correct')
      return `${base} ${
        settings.colorBlind
          ? 'bg-blue-600 border-blue-600'
          : 'bg-green-600 border-green-600'
      }`;
    if (status === 'present')
      return `${base} ${
        settings.colorBlind
          ? 'bg-orange-500 border-orange-500'
          : 'bg-yellow-500 border-yellow-500'
      }`;
    if (status === 'absent') return `${base} bg-gray-700 border-gray-700`;
    return `${base} border-gray-500`;
  };

  return (
    <div className="h-full w-full flex flex-col items-center bg-panel text-white p-4">
      <div className="flex justify-between items-center w-full max-w-sm mb-2">
        <select
          value={difficulty}
          onChange={(e) => setDifficulty(e.target.value as Difficulty)}
          className="text-black text-sm"
          aria-label="difficulty"
        >
          {difficulties.map((d) => (
            <option key={d} value={d}>
              {d}
            </option>
          ))}
        </select>
        <label className="text-sm flex items-center space-x-1">
          <input
            type="checkbox"
            checked={hardMode}
            onChange={() => setHardMode(!hardMode)}
          />
          <span>Hard</span>
        </label>
      </div>
      <div className="flex justify-between items-center w-full max-w-sm mb-2">
        <button
          onClick={useHint}
          disabled={hints === 0}
          className="px-3 py-1 bg-gray-600 rounded text-sm"
        >
          Hint ({hints})
        </button>
        <div className="text-sm">Streak: {streak}</div>
        <label className="text-sm flex items-center space-x-1">
          <input
            type="checkbox"
            checked={colorBlind}
            onChange={() => setColorBlind(!colorBlind)}
          />
          <span>Color blind</span>
        </label>
      </div>

      <div
        className="grid gap-1 mb-2"
        style={{ gridTemplateColumns: `repeat(${COLS},3rem)` }}
      >
        {Array.from({ length: ROWS }).map((_, r) => (
          <div key={r} className="flex space-x-1">
            {Array.from({ length: COLS }).map((__, c) => {
              const letter =
                guesses[r]?.[c]?.toUpperCase() ||
                (r === guesses.length ? current[c] : '') ||
                '';
              const status = statuses[r]?.[c];
              return (
                <div
                  key={c}
                  className={getCellClass(status)}
                  aria-label={`${letter || 'blank'} ${status || 'empty'}`}
                >

                  {letter}
                </div>
              );
            })}
          </div>
        ))}
      </div>
      {message && (
        <div className="mb-2 text-sm" role="status" aria-live="polite">
          {message}
        </div>
      )}
      {gameOver && (
        <div className="flex space-x-2 mb-2">
          <button
            onClick={share}
            className="px-3 py-1 bg-gray-600 rounded text-sm"
          >
            Share
          </button>
          <button
            onClick={exportReplay}
            className="px-3 py-1 bg-gray-600 rounded text-sm"
          >
            Export
          </button>
          {settings.mode === 'infinite' && (
            <button
              onClick={resetGame}
              className="px-3 py-1 bg-gray-600 rounded text-sm"
            >
              New Game
            </button>
          )}
        </div>
      )}
      <Keyboard
        onKey={handleKey}
        keyStatuses={keyStatuses}
        colorBlind={settings.colorBlind}
        reducedMotion={settings.reducedMotion}
      />
      {suggestions.length > 0 && (
        <div className="mt-4 text-xs">
          {suggestions.map((s) => (
            <div key={s.word}>
              {s.word.toUpperCase()} {s.entropy.toFixed(2)} bits
            </div>
          ))}
        </div>
      )}
      <Keyboard onKey={handleKey} keyStatuses={keyStatuses} colorBlind={colorBlind} />

    </div>
  );
};

export default Wordle;

