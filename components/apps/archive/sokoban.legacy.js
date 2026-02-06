import React, { useRef, useState, useEffect } from 'react';
import GameLayout from './GameLayout';
import useGameControls from './useGameControls';
import levelPack from './sokoban_levels.json';

const TILE = 32;

// Provide a lightweight structuredClone polyfill for browsers that lack support
if (typeof globalThis.structuredClone !== 'function') {
  globalThis.structuredClone = (val) => JSON.parse(JSON.stringify(val));
}

const parseLevel = (level) => {
  const board = level.map((r) => r.split(''));
  let player = { x: 0, y: 0 };
  for (let y = 0; y < board.length; y++) {
    for (let x = 0; x < board[y].length; x++) {
      const cell = board[y][x];
      if (cell === '@' || cell === '+') player = { x, y };
    }
  }
  return { board, player, moves: 0, pushes: 0 };
};

const parseLevelsFromText = (text) =>
  text
    .replace(/\r/g, '')
    .trim()
    .split(/\n\s*\n/)
    .map((lvl) => lvl.split('\n'));

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
  const stateRef = useRef();
const initialLevels = Array.isArray(levelPack.levels)
  ? levelPack.levels
  : parseLevelsFromText(levelPack);
const initialState = parseLevel(initialLevels[0]);
const historyRef = useRef([initialState]);
  const sliderRaf = useRef();
  const liveRef = useRef();
  const prefersReducedMotion = useRef(false);

const [levels, setLevels] = useState(initialLevels);
  const [levelIndex, setLevelIndex] = useState(0);
  const [state, setState] = useState(initialState);
  const [historyIndex, setHistoryIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [sound, setSound] = useState(true);
const [best, setBest] = useState(null);

  stateRef.current = state;

const loadBest = (idx) => {
  const b = localStorage.getItem(`sokoban-best-${idx}`);
  setBest(b ? JSON.parse(b) : null);
};

const saveProgress = (idx, st) => {
  try {
    localStorage.setItem(
      `sokoban-progress-${idx}`,
      JSON.stringify({
        board: st.board.map((r) => r.join('')),
        player: st.player,
        moves: st.moves,
        pushes: st.pushes,
      }),
    );
  } catch {
    // ignore storage errors
  }
};

const loadState = (idx, lvls) => {
  const saved = localStorage.getItem(`sokoban-progress-${idx}`);
  if (saved) {
    try {
      const data = JSON.parse(saved);
      return {
        board: data.board.map((r) => r.split('')),
        player: data.player,
        moves: data.moves || 0,
        pushes: data.pushes || 0,
      };
    } catch {
      // ignore parse errors
    }
  }
  return parseLevel(lvls[idx]);
};

  useEffect(() => {
    loadBest(levelIndex);
  }, [levelIndex]);

  useEffect(() => {
    prefersReducedMotion.current =
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }, []);

  useEffect(() => {
    const st = loadState(levelIndex, levels);
    setState(st);
    undoRef.current = [];
    historyRef.current = [st];
    setHistoryIndex(0);
  }, [levelIndex, levels]);

  const playBeep = () => {
    if (!sound) return;
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
  };

const move = ({ x, y }) => {
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
  const progressKey = `sokoban-progress-${levelIndex}`;
  if (checkWin(res.board)) {
    const bestKey = `sokoban-best-${levelIndex}`;
    if (
      !best ||
      newState.moves < best.moves ||
      (newState.moves === best.moves && newState.pushes < best.pushes)
    ) {
      localStorage.setItem(
        bestKey,
        JSON.stringify({ moves: newState.moves, pushes: newState.pushes }),
      );
      setBest({ moves: newState.moves, pushes: newState.pushes });
    }
    localStorage.removeItem(progressKey);
  }
};

  useGameControls(move);

  useEffect(() => {
    if (!checkWin(state.board)) saveProgress(levelIndex, state);
  }, [state, levelIndex]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const draw = () => {
      const { board, player } = stateRef.current;
      const h = board.length;
      const w = board[0].length;
      canvas.width = w * TILE;
      canvas.height = h * TILE;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
          const cell = board[y][x];
          ctx.fillStyle = cell === '#' ? '#444' : '#777';
          ctx.fillRect(x * TILE, y * TILE, TILE, TILE);
          if (cell === '.' || cell === '+' || cell === '*') {
            ctx.fillStyle = '#ff0';
            ctx.beginPath();
            ctx.arc(x * TILE + TILE / 2, y * TILE + TILE / 2, TILE / 6, 0, Math.PI * 2);
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

  const undo = () => {
    const prev = undoRef.current.pop();
    if (prev) {
      setState(prev);
      setHistoryIndex((i) => Math.max(0, i - 1));
    }
  };

  const reset = () => {
    const st = parseLevel(levels[levelIndex]);
    setState(st);
    undoRef.current = [];
    historyRef.current = [st];
    setHistoryIndex(0);
  };

  const handleRewind = (e) => {
    const idx = Number(e.target.value);
    setHistoryIndex(idx);
    const update = () => {
      setState(historyRef.current[idx]);
      if (liveRef.current) liveRef.current.textContent = `Rewind to move ${idx}`;
    };
    if (prefersReducedMotion.current) update();
    else {
      cancelAnimationFrame(sliderRaf.current);
      sliderRaf.current = requestAnimationFrame(update);
    }
  };

  const handleFile = (e) => {
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
  };

  const exportLevels = () => {
    const text = levels.map((l) => l.join('\n')).join('\n\n');
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'sokoban_levels.txt';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <GameLayout stage={levelIndex + 1}>
      <canvas
        ref={canvasRef}
        className="mx-auto bg-gray-700"
        role="img"
        aria-label="Sokoban board"
      />
      <div className="mt-2 flex flex-wrap items-center justify-center space-x-2">
        <select
          value={levelIndex}
          onChange={(e) => setLevelIndex(Number(e.target.value))}
          aria-label="Select level"
        >
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
          onClick={() => setPaused((p) => !p)}
        >
          {paused ? 'Resume' : 'Pause'}
        </button>
        <button className="px-2 py-1 bg-gray-700 rounded" onClick={() => setSound((s) => !s)}>
          {sound ? 'Sound On' : 'Sound Off'}
        </button>
        <button className="px-2 py-1 bg-gray-700 rounded" onClick={exportLevels}>
          Export
        </button>
        <input type="file" accept=".txt,.json" onChange={handleFile} aria-label="Import levels" />
        <input
          type="range"
          min="0"
          max={historyRef.current.length - 1}
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
