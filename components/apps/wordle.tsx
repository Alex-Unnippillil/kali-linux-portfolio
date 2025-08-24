import React, { useState, useEffect, useCallback } from 'react';
import { ANSWERS, GUESSES } from '../../apps/wordle/words';

const ROWS = 6;
const COLS = 5;

const seedIndex = () => {
  const epoch = new Date('2024-01-01T00:00:00Z');
  const today = new Date();
  const diff = Math.floor(
    (today.setUTCHours(0, 0, 0, 0) - epoch.getTime()) / 86400000,
  );
  return diff % ANSWERS.length;
};

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
  reducedMotion,
}: {
  onKey: (k: string) => void;
  keyStatuses: Record<string, string>;
  colorBlind: boolean;
  reducedMotion: boolean;
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
            >
              {ch}
            </button>
          ))}
          {i === 2 && (
            <button
              className={`px-3 py-2 rounded text-sm bg-gray-500 ${motionCls}`}
              onClick={() => onKey('BACKSPACE')}
            >
              ⌫
            </button>
          )}
        </div>
      ))}
    </div>
  );
};

const Wordle = () => {
  const [settings, setSettings] = useState<Settings>(() => {
    if (typeof window === 'undefined') return defaultSettings;
    try {
      return {
        ...defaultSettings,
        ...JSON.parse(localStorage.getItem('wordle-settings') || '{}'),
      };
    } catch {
      return defaultSettings;
    }
  });
  const [stats, setStats] = useState<Stats>(() => {
    if (typeof window === 'undefined') return defaultStats;
    try {
      return {
        ...defaultStats,
        ...JSON.parse(localStorage.getItem('wordle-stats') || '{}'),
      };
    } catch {
      return defaultStats;
    }
  });

  useEffect(() => {
    localStorage.setItem('wordle-settings', JSON.stringify(settings));
  }, [settings]);
  useEffect(() => {
    localStorage.setItem('wordle-stats', JSON.stringify(stats));
  }, [stats]);

  const newAnswer = useCallback(() => {
    return settings.mode === 'daily'
      ? ANSWERS[seedIndex()]
      : ANSWERS[Math.floor(Math.random() * ANSWERS.length)];
  }, [settings.mode]);

  const [answer, setAnswer] = useState(() => newAnswer());
  const [guesses, setGuesses] = useState<string[]>([]);
  const [statuses, setStatuses] = useState<string[][]>([]);
  const [current, setCurrent] = useState('');
  const [message, setMessage] = useState('');
  const [gameOver, setGameOver] = useState(false);
  const [keyStatuses, setKeyStatuses] = useState<Record<string, string>>({});
  const [candidates, setCandidates] = useState<string[]>(ANSWERS);
  const [suggestions, setSuggestions] = useState<
    { word: string; entropy: number }[]
  >([]);

  const resetGame = useCallback(() => {
    setGuesses([]);
    setStatuses([]);
    setCurrent('');
    setMessage('');
    setGameOver(false);
    setKeyStatuses({});
    setCandidates(ANSWERS);
    setAnswer(newAnswer());
  }, [newAnswer]);

  useEffect(() => {
    resetGame();
  }, [settings.mode, resetGame]);

  const filterCandidates = useCallback((gs: string[], sts: string[][]) => {
    return ANSWERS.filter((ans) =>
      gs.every(
        (g, idx) => evaluateGuess(g, ans).join('') === sts[idx].join(''),
      ),
    );
  }, []);

  useEffect(() => {
    setCandidates(filterCandidates(guesses, statuses));
  }, [guesses, statuses, filterCandidates]);

  useEffect(() => {
    const poss = candidates.length;
    if (poss === 0) {
      setSuggestions([]);
      return;
    }
    const sugg = GUESSES.map((word) => {
      const patterns: Record<string, number> = {};
      candidates.forEach((ans) => {
        const p = evaluateGuess(word, ans).join('');
        patterns[p] = (patterns[p] || 0) + 1;
      });
      const entropy = Object.values(patterns).reduce((sum, count) => {
        const p = count / poss;
        return sum - p * Math.log2(p);
      }, 0);
      return { word, entropy };
    })
      .sort((a, b) => b.entropy - a.entropy)
      .slice(0, 5);
    setSuggestions(sugg);
  }, [candidates]);

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
    if (![...GUESSES, ...ANSWERS].includes(lower))
      return setMessage('Word not in list');
    if (!checkHardMode(lower)) return setMessage('Use revealed hints');

    const evals = evaluateGuess(lower, answer);
    const newGuesses = [...guesses, lower];
    const newStatuses = [...statuses, evals];
    setGuesses(newGuesses);
    setStatuses(newStatuses);
    setCurrent('');
    setMessage('');

    setKeyStatuses((prev) => {
      const next = { ...prev };
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
      const newStreak = stats.streak + 1;
      setStats({
        played: stats.played + 1,
        wins: stats.wins + 1,
        streak: newStreak,
        maxStreak: Math.max(stats.maxStreak, newStreak),
      });
    } else if (guesses.length + 1 === ROWS) {
      setGameOver(true);
      setMessage(`Word was ${answer.toUpperCase()}`);
      setStats({
        played: stats.played + 1,
        wins: stats.wins,
        streak: 0,
        maxStreak: Math.max(stats.maxStreak, stats.streak),
      });
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

  const share = () => {
    const grid = statuses
      .map((row) =>
        row
          .map((s) => (s === 'correct' ? '🟩' : s === 'present' ? '🟨' : '⬛'))
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
      <div className="flex flex-col w-full max-w-sm mb-2 space-y-1">
        <div className="flex justify-between items-center">
          <h1 className="text-lg font-bold">Wordle</h1>
          <span className="text-sm">Streak: {stats.streak}</span>
        </div>
        <div className="flex justify-between items-center text-sm">
          <label className="flex items-center space-x-1">
            <input
              type="checkbox"
              checked={settings.hardMode}
              onChange={() =>
                setSettings({ ...settings, hardMode: !settings.hardMode })
              }
            />
            <span>Hard</span>
          </label>
          <label className="flex items-center space-x-1">
            <input
              type="checkbox"
              checked={settings.colorBlind}
              onChange={() =>
                setSettings({ ...settings, colorBlind: !settings.colorBlind })
              }
            />
            <span>Color</span>
          </label>
          <label className="flex items-center space-x-1">
            <input
              type="checkbox"
              checked={settings.reducedMotion}
              onChange={() =>
                setSettings({
                  ...settings,
                  reducedMotion: !settings.reducedMotion,
                })
              }
            />
            <span>Reduce</span>
          </label>
          <select
            className="bg-gray-700 rounded px-1"
            value={settings.mode}
            onChange={(e) =>
              setSettings({
                ...settings,
                mode: e.target.value as 'daily' | 'infinite',
              })
            }
          >
            <option value="daily">Daily</option>
            <option value="infinite">Infinite</option>
          </select>
        </div>
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
                <div key={c} className={getTileClass(status)}>
                  {letter}
                </div>
              );
            })}
          </div>
        ))}
      </div>
      {message && <div className="mb-2 text-sm">{message}</div>}
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
    </div>
  );
};

export default Wordle;

