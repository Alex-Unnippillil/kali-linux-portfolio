import React, { useEffect, useState, useRef } from 'react';
import {
  MinesweeperGame,
  createGame,
  reveal,
  toggleFlag,
  isMine,
  isRevealed,
  isFlagged,
  adjacent,
  isComplete,
  serialize,
  deserialize,
  chord,
} from '../../apps/minesweeper/engine';

interface SaveData {
  game: string;
  elapsed: number;
  status: string;
  settings: { width: number; height: number; mines: number };
}

const defaultSettings = { width: 8, height: 8, mines: 10 };

const Minesweeper: React.FC = () => {
  const [settings, setSettings] = useState(defaultSettings);
  const [game, setGame] = useState<MinesweeperGame | null>(
    createGame(defaultSettings.width, defaultSettings.height, defaultSettings.mines),
  );
  const [status, setStatus] = useState<'ready' | 'playing' | 'won' | 'lost'>('ready');
  const [elapsed, setElapsed] = useState(0);
  const [start, setStart] = useState<number | null>(null);
  const [paused, setPaused] = useState(false);
  const [selected, setSelected] = useState({ x: 0, y: 0 });
  const [dark, setDark] = useState(false);
  const [scores, setScores] = useState<{ name: string; time: number }[]>([]);
  const [showProbs, setShowProbs] = useState(false);
  const [probabilities, setProbabilities] = useState<number[]>([]);
  const workerRef = useRef<Worker>();
  const boardRef = useRef<HTMLDivElement>(null);

  const flagged = React.useMemo(() => {
    if (!game) return 0;
    let c = 0;
    for (let x = 0; x < game.height; x++) {
      for (let y = 0; y < game.width; y++) {
        if (isFlagged(game, x, y)) c++;
      }
    }
    return c;
  }, [game]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const raw = localStorage.getItem('minesweeper-save');
    if (raw) {
      try {
        const data: SaveData = JSON.parse(raw);
        setSettings(data.settings);
        setGame(deserialize(data.game));
        setElapsed(data.elapsed);
        setStatus(data.status as any);
        setStart(Date.now() - data.elapsed * 1000);
      } catch {
        // ignore
      }
    }
    fetch('/api/minesweeper/scores')
      .then((r) => r.json())
      .then(setScores)
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (status === 'playing' && !paused) {
      const id = setInterval(
        () => setElapsed((Date.now() - (start || 0)) / 1000),
        100,
      );
      return () => clearInterval(id);
    }
  }, [status, start, paused]);

  useEffect(() => {
    if (typeof window === 'undefined' || !game) return;
    const data: SaveData = {
      game: serialize(game),
      elapsed,
      status,
      settings,
    };
    localStorage.setItem('minesweeper-save', JSON.stringify(data));
  }, [game, elapsed, status, settings]);

  useEffect(() => {
    if (!showProbs) {
      workerRef.current?.terminate();
      workerRef.current = undefined;
      setProbabilities([]);
      return;
    }
    workerRef.current = new Worker(
      new URL('./minesweeper-prob.worker.ts', import.meta.url),
      { type: 'module' },
    );
    const w = workerRef.current;
    w.onmessage = (e) => setProbabilities(e.data.probabilities);
    return () => w.terminate();
  }, [showProbs]);

  useEffect(() => {
    if (showProbs && game && workerRef.current) {
      workerRef.current.postMessage({ game: serialize(game) });
    }
  }, [game, showProbs]);

  const handleReveal = (x: number, y: number) => {
    if (status === 'lost' || status === 'won') return;
    let g = game;
    if (!g) {
      g = createGame(settings.width, settings.height, settings.mines);
      setGame(g);
    }
    if (status !== 'playing') {
      setStatus('playing');
      setStart(Date.now());
    }
    const hit = reveal(g, x, y);
    setGame({ ...g });
    if (hit) {
      setStatus('lost');
    } else if (isComplete(g)) {
      setStatus('won');
      saveScore(elapsed);
    }
  };

  const handleFlag = (x: number, y: number) => {
    if (!game || status !== 'playing') return;
    toggleFlag(game, x, y);
    setGame({ ...game });
  };

  const handleChord = (x: number, y: number) => {
    if (!game || status !== 'playing') return;
    const hit = chord(game, x, y);
    setGame({ ...game });
    if (hit) {
      setStatus('lost');
    } else if (isComplete(game)) {
      setStatus('won');
      saveScore(elapsed);
    }
  };

  const saveScore = (time: number) => {
    const name = prompt('Name for leaderboard?') || 'Anonymous';
    fetch('/api/minesweeper/scores', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, time }),
    })
      .then(() =>
        fetch('/api/minesweeper/scores')
          .then((r) => r.json())
          .then(setScores),
      )
      .catch(() => {});
  };

  const handleKey = (e: React.KeyboardEvent) => {
    if (!game) return;
    if (e.key === 'ArrowUp') setSelected((s) => ({ x: Math.max(0, s.x - 1), y: s.y }));
    else if (e.key === 'ArrowDown')
      setSelected((s) => ({ x: Math.min(settings.height - 1, s.x + 1), y: s.y }));
    else if (e.key === 'ArrowLeft')
      setSelected((s) => ({ x: s.x, y: Math.max(0, s.y - 1) }));
    else if (e.key === 'ArrowRight')
      setSelected((s) => ({ x: s.x, y: Math.min(settings.width - 1, s.y + 1) }));
    else if (e.key === 'f' || e.key === 'F') handleFlag(selected.x, selected.y);
    else if (e.key === ' ' || e.key === 'Enter') handleReveal(selected.x, selected.y);
  };

  const newGame = () => {
    const g = createGame(settings.width, settings.height, settings.mines);
    setGame(g);
    setStatus('ready');
    setElapsed(0);
    setStart(null);
    localStorage.removeItem('minesweeper-save');
  };

  const togglePause = () => {
    if (status !== 'playing') return;
    if (paused) {
      setStart(Date.now() - elapsed * 1000);
    }
    setPaused((p) => !p);
  };

  const cellClass = (x: number, y: number) => {
    if (!game) return 'bg-gray-300 dark:bg-gray-700';
    if (isRevealed(game, x, y)) {
      if (isMine(game, x, y)) return 'bg-red-500';
      return 'bg-gray-200 dark:bg-gray-600';
    }
    return 'bg-gray-300 dark:bg-gray-700';
  };

  return (
    <div className={dark ? 'dark' : ''}>
      <div
        className="p-2 text-sm dark:bg-gray-900 dark:text-gray-100 bg-gray-100 text-gray-900"
        tabIndex={0}
        onKeyDown={handleKey}
        ref={boardRef}
      >
        <div className="mb-2 flex gap-2 flex-wrap items-center">
          <label className="flex items-center gap-1">
            W:
            <input
              className="w-14 border px-1"
              type="number"
              min={2}
              value={settings.width}
              onChange={(e) =>
                setSettings({ ...settings, width: parseInt(e.target.value) || 0 })
              }
            />
          </label>
          <label className="flex items-center gap-1">
            H:
            <input
              className="w-14 border px-1"
              type="number"
              min={2}
              value={settings.height}
              onChange={(e) =>
                setSettings({ ...settings, height: parseInt(e.target.value) || 0 })
              }
            />
          </label>
          <label className="flex items-center gap-1">
            M:
            <input
              className="w-14 border px-1"
              type="number"
              min={1}
              value={settings.mines}
              onChange={(e) =>
                setSettings({ ...settings, mines: parseInt(e.target.value) || 0 })
              }
            />
          </label>
          <button className="px-2 py-1 border" onClick={newGame}>
            New
          </button>
          <button className="px-2 py-1 border" onClick={togglePause}>
            {paused ? 'Resume' : 'Pause'}
          </button>
          <button className="px-2 py-1 border" onClick={() => setDark((d) => !d)}>
            Toggle Theme
          </button>
          <button className="px-2 py-1 border" onClick={() => setShowProbs((p) => !p)}>
            {showProbs ? 'Hide Hints' : 'Show Hints'}
          </button>
          <span>Mines left: {settings.mines - flagged}</span>
          <span>Time: {elapsed.toFixed(1)}</span>
        </div>
        {status === 'won' && <div className="mb-2">You win!</div>}
        {status === 'lost' && <div className="mb-2">Game over</div>}
        {paused && <div className="mb-2">Paused</div>}
        <div
          className="grid"
          style={{ gridTemplateColumns: `repeat(${settings.width},1.5rem)` }}
        >
          {Array.from({ length: settings.height }).map((_, x) =>
            Array.from({ length: settings.width }).map((_, y) => {
              const revealed = game && isRevealed(game, x, y);
              const flag = game && isFlagged(game, x, y);
              const adj = game ? adjacent(game, x, y) : 0;
              const idx = x * settings.width + y;
              const sel = selected.x === x && selected.y === y;
              return (
                <div
                  key={`${x}-${y}`}
                  onClick={() => handleReveal(x, y)}
                  onContextMenu={(e) => {
                    e.preventDefault();
                    handleFlag(x, y);
                  }}
                  onDoubleClick={() => handleChord(x, y)}
                  className={`${cellClass(x, y)} w-6 h-6 border border-gray-400 flex items-center justify-center text-xs ${sel ? 'outline outline-2 outline-blue-500' : ''}`}
                >
                  {revealed && !isMine(game!, x, y) && adj > 0 && adj}
                  {!revealed && flag && '🚩'}
                  {revealed && isMine(game!, x, y) && '💣'}
                  {!revealed && !flag && showProbs && probabilities[idx] != null && (
                    <span className="text-[0.6rem] text-blue-800">
                      {(probabilities[idx] * 100).toFixed(0)}
                    </span>
                  )}
                </div>
              );
            }),
          )}
        </div>
        <div className="mt-4">
          <h3 className="font-bold mb-1">Leaderboard</h3>
          <ol className="list-decimal pl-4 text-xs">
            {scores.map((s, i) => (
              <li key={i}>
                {s.name} - {s.time.toFixed(1)}s
              </li>
            ))}
          </ol>
        </div>
      </div>
    </div>
  );
};

export default Minesweeper;
