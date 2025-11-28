import React, {
  useRef,
  useState,
  useEffect,
  useMemo,
  useCallback,
} from 'react';
import GameLayout from './GameLayout';
import useGameControls, {
  useGameSettings,
  useGamePersistence,
} from './useGameControls';
import levelPack from './sokoban_levels.json';
import {
  makeLevelKey,
  serializeState,
  deserializeState,
  readProgressSnapshot,
  updateProgressSnapshot,
  removeProgressSnapshot,
  sanitizeSnapshot,
  loadBestFromStorage,
  saveBestToStorage,
  encodeScore,
} from './sokobanState';

const TILE = 32;

// Provide a lightweight structuredClone polyfill for browsers that lack support
if (typeof globalThis.structuredClone !== 'function') {
  globalThis.structuredClone = (val) => JSON.parse(JSON.stringify(val));
}

function parseLevel(level) {
  const board = level.map((r) => r.split(''));
  let player = { x: 0, y: 0 };
  for (let y = 0; y < board.length; y += 1) {
    for (let x = 0; x < board[y].length; x += 1) {
      const cell = board[y][x];
      if (cell === '@' || cell === '+') player = { x, y };
    }
  }
  return { board, player, moves: 0, pushes: 0 };
}

function parseLevelsFromText(text) {
  return text
    .replace(/\r/g, '')
    .trim()
    .split(/\n\s*\n/)
    .map((lvl) => lvl.split('\n'));
}

const attemptMove = (state, dx, dy) => {
  const { board, player } = state;
  const x = player.x;
  const y = player.y;
  const target = board[y + dy]?.[x + dx];
  const beyond = board[y + 2 * dy]?.[x + 2 * dx];
  if (!target || target === '#') return null;
  const newBoard = board.map((r) => r.slice());
  const newPlayer = { ...player };
  const replacePlayerTile = () => {
    newBoard[y][x] = newBoard[y][x] === '+' ? '.' : ' ';
  };
  let push = false;
  if (target === ' ' || target === '.') {
    replacePlayerTile();
    newBoard[y + dy][x + dx] = target === '.' ? '+' : '@';
    newPlayer.x += dx;
    newPlayer.y += dy;
  } else if (target === '$' || target === '*') {
    if (beyond === ' ' || beyond === '.') {
      replacePlayerTile();
      newBoard[y + dy][x + dx] = target === '*' ? '+' : '@';
      newBoard[y + 2 * dy][x + 2 * dx] = beyond === '.' ? '*' : '$';
      newPlayer.x += dx;
      newPlayer.y += dy;
      push = true;
    } else {
      return null;
    }
  } else {
    return null;
  }
  return { board: newBoard, player: newPlayer, push };
};

const checkWin = (board) => {
  for (const row of board) {
    if (row.includes('.') || row.includes('+')) return false;
  }
  return true;
};

const Sokoban = () => {
  const canvasRef = useRef(null);
  const rafRef = useRef();
  const undoRef = useRef([]);
  const historyRef = useRef([]);
  const stateRef = useRef();
  const sliderRaf = useRef();
  const liveRef = useRef();
  const prefersReducedMotion = useRef(false);
  const skipHydrateRef = useRef(false);

  const defaultLevels = useMemo(
    () =>
      Array.isArray(levelPack.levels)
        ? levelPack.levels
        : parseLevelsFromText(levelPack),
    [],
  );

  const [levels, setLevels] = useState(defaultLevels);
  const [levelIndex, setLevelIndex] = useState(0);
  const [progress, setProgress] = useState({});
  const [state, setState] = useState(() => {
    const initial = parseLevel(defaultLevels[0]);
    historyRef.current = [initial];
    return initial;
  });
  const [historyIndex, setHistoryIndex] = useState(0);
  const [best, setBest] = useState(null);

  const { paused, togglePause, muted, toggleMute } = useGameSettings('sokoban');
  const { saveSnapshot, loadSnapshot, getHighScore, setHighScore } =
    useGamePersistence('sokoban');

  const levelKey = useMemo(
    () => makeLevelKey(levels[levelIndex]),
    [levels, levelIndex],
  );

  stateRef.current = state;

  const playBeep = useCallback(() => {
    if (muted) return;
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = 440;
      osc.start();
      osc.stop(ctx.currentTime + 0.05);
    } catch {
      // ignore audio errors
    }
  }, [muted]);

  useEffect(() => {
    const stored = loadSnapshot();
    if (stored) setProgress(sanitizeSnapshot(stored));
  }, [loadSnapshot]);

  useEffect(() => {
    const bestStats = loadBestFromStorage(
      typeof window === 'undefined' ? null : window.localStorage,
      `sokoban-best:${levelKey}`,
    );
    setBest(bestStats);
    if (bestStats) {
      const encoded = encodeScore(bestStats);
      if (encoded > getHighScore()) setHighScore(encoded);
    }
  }, [levelKey, getHighScore, setHighScore]);

  useEffect(() => {
    prefersReducedMotion.current =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }, []);

  const hydrateLevel = useCallback(
    (snapshot) => {
      const base = snapshot
        ? deserializeState(snapshot)
        : parseLevel(levels[levelIndex]);
      undoRef.current = [];
      historyRef.current = [base];
      setHistoryIndex(0);
      setState(base);
    },
    [levelIndex, levels],
  );

  useEffect(() => {
    if (skipHydrateRef.current) {
      skipHydrateRef.current = false;
      return;
    }
    const saved = readProgressSnapshot(progress, levelKey);
    hydrateLevel(saved);
  }, [progress, levelKey, hydrateLevel]);

  const persistState = useCallback(
    (nextState, solved = false) => {
      skipHydrateRef.current = true;
      setProgress((prev) => {
        const updated = solved
          ? removeProgressSnapshot(prev, levelKey)
          : updateProgressSnapshot(prev, levelKey, serializeState(nextState));
        if (updated === prev) {
          skipHydrateRef.current = false;
          return prev;
        }
        saveSnapshot(updated);
        return updated;
      });
    },
    [levelKey, saveSnapshot],
  );

  const recordWin = useCallback(
    (stats) => {
      const storage = typeof window === 'undefined' ? null : window.localStorage;
      const updated = saveBestToStorage(storage, `sokoban-best:${levelKey}`, stats);
      setBest(updated);
      setHighScore(encodeScore(updated));
    },
    [levelKey, setHighScore],
  );

  const move = useCallback(
    ({ x, y }) => {
      if (paused) return;
      const res = attemptMove(stateRef.current, x, y);
      if (!res) return;
      undoRef.current.push(structuredClone(stateRef.current));
      const newState = {
        board: res.board,
        player: res.player,
        moves: stateRef.current.moves + 1,
        pushes: stateRef.current.pushes + (res.push ? 1 : 0),
      };
      historyRef.current = historyRef.current
        .slice(0, historyIndex + 1)
        .concat([newState]);
      setHistoryIndex(historyRef.current.length - 1);
      setState(newState);
      playBeep();
      if (checkWin(res.board)) {
        persistState(newState, true);
        recordWin({ moves: newState.moves, pushes: newState.pushes });
      } else {
        persistState(newState);
      }
    },
    [historyIndex, paused, persistState, playBeep, recordWin],
  );

  useGameControls(move, 'sokoban');

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;
    const ctx = canvas.getContext('2d');

    /**
     * Keep a single requestAnimationFrame loop alive so rewind scrubbing and
     * external resume events remain responsive. Drawing short-circuits while
     * paused, effectively freezing the board without tearing down listeners.
     */
    const draw = () => {
      const { board, player } = stateRef.current;
      const h = board.length;
      const w = board[0].length;
      canvas.width = w * TILE;
      canvas.height = h * TILE;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      for (let y = 0; y < h; y += 1) {
        for (let x = 0; x < w; x += 1) {
          const cell = board[y][x];
          ctx.fillStyle = cell === '#' ? '#444' : '#777';
          ctx.fillRect(x * TILE, y * TILE, TILE, TILE);
          if (cell === '.' || cell === '+' || cell === '*') {
            ctx.fillStyle = '#ff0';
            ctx.beginPath();
            ctx.arc(
              x * TILE + TILE / 2,
              y * TILE + TILE / 2,
              TILE / 6,
              0,
              Math.PI * 2,
            );
            ctx.fill();
          }
          if (cell === '$' || cell === '*') {
            ctx.fillStyle = '#d60';
            ctx.fillRect(x * TILE + 4, y * TILE + 4, TILE - 8, TILE - 8);
          }
        }
      }
      ctx.fillStyle = '#0af';
      ctx.fillRect(player.x * TILE + 4, player.y * TILE + 4, TILE - 8, TILE - 8);
    };

    const loop = () => {
      if (!paused) draw();
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafRef.current);
  }, [paused]);

  const undo = useCallback(() => {
    const prev = undoRef.current.pop();
    if (prev) {
      setState(prev);
      setHistoryIndex((i) => Math.max(0, i - 1));
      persistState(prev, checkWin(prev.board));
    }
  }, [persistState]);

  const reset = useCallback(() => {
    const st = parseLevel(levels[levelIndex]);
    setState(st);
    undoRef.current = [];
    historyRef.current = [st];
    setHistoryIndex(0);
    persistState(st);
  }, [levelIndex, levels, persistState]);

  const handleRewind = useCallback(
    (e) => {
      const idx = Number(e.target.value);
      setHistoryIndex(idx);
      const update = () => {
        const snapshot = historyRef.current[idx];
        if (!snapshot) return;
        setState(snapshot);
        persistState(snapshot, checkWin(snapshot.board));
        if (liveRef.current) liveRef.current.textContent = `Rewind to move ${idx}`;
      };
      if (prefersReducedMotion.current) update();
      else {
        cancelAnimationFrame(sliderRaf.current);
        sliderRaf.current = requestAnimationFrame(update);
      }
    },
    [persistState],
  );

  const handleFile = useCallback(
    (e) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        try {
          const text = ev.target.result;
          let parsed;
          if (file.name.endsWith('.json')) {
            const data = JSON.parse(text);
            parsed = Array.isArray(data) ? data : data.levels;
          } else {
            parsed = parseLevelsFromText(text);
          }
          if (parsed && parsed.length) {
            setLevels(parsed);
            setLevelIndex(0);
          }
        } catch {
          // ignore parse errors
        }
      };
      reader.readAsText(file);
    },
    [hydrateLevel],
  );

  const exportLevels = useCallback(() => {
    const text = levels.map((l) => l.join('\n')).join('\n\n');
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'sokoban_levels.txt';
    a.click();
    URL.revokeObjectURL(url);
  }, [levels]);

  return (
    <GameLayout
      gameId="sokoban"
      stage={levelIndex + 1}
      highScore={best ? best.moves : undefined}
    >
      <canvas ref={canvasRef} className="mx-auto bg-gray-700" />
      <div className="mt-2 flex flex-wrap items-center justify-center space-x-2">
        <select value={levelIndex} onChange={(e) => setLevelIndex(Number(e.target.value))}>
          {levels.map((_, i) => (
            <option key={i} value={i}>{`Level ${i + 1}`}</option>
          ))}
        </select>
        <button className="px-2 py-1 bg-gray-700 rounded" onClick={undo}>
          Undo
        </button>
        <button className="px-2 py-1 bg-gray-700 rounded" onClick={reset}>
          Reset
        </button>
        <button
          className="px-2 py-1 bg-gray-700 rounded"
          onClick={togglePause}
        >
          {paused ? 'Resume' : 'Pause'}
        </button>
        <button
          className="px-2 py-1 bg-gray-700 rounded"
          onClick={toggleMute}
        >
          {muted ? 'Sound Off' : 'Sound On'}
        </button>
        <button className="px-2 py-1 bg-gray-700 rounded" onClick={exportLevels}>
          Export
        </button>
        <input type="file" accept=".txt,.json" onChange={handleFile} />
        <input
          type="range"
          min="0"
          max={Math.max(0, historyRef.current.length - 1)}
          value={historyIndex}
          onChange={handleRewind}
          className="w-32 accent-blue-500 bg-gray-600"
          aria-label="Rewind moves"
        />
        <div>Moves: {state.moves}</div>
        <div>Pushes: {state.pushes}</div>
        <div>
          Best: {best ? `${best.moves}/${best.pushes}` : '-'}
          {best &&
            checkWin(state.board) &&
            state.moves === best.moves &&
            state.pushes === best.pushes && (
              <span className="ml-1 text-green-400">Optimal!</span>
            )}
        </div>
        <div ref={liveRef} aria-live="polite" className="sr-only" />
      </div>
    </GameLayout>
  );
};

export default Sokoban;
