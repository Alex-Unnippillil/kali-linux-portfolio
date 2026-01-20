import React, { useRef, useState, useEffect, useMemo, useCallback } from 'react';
import GameLayout from './GameLayout';
import useGameControls from './useGameControls';
import levelPack from './sokoban_levels.json';
import usePersistedState from '../../hooks/usePersistedState';

const TILE_DEFAULT = 32;
const MAX_HISTORY = 5000;
const VALID_TILES = new Set(['#', ' ', '.', '@', '+', '$', '*']);

// Provide a lightweight structuredClone polyfill for browsers that lack support
if (typeof globalThis.structuredClone !== 'function') {
  globalThis.structuredClone = (val) => JSON.parse(JSON.stringify(val));
}

const isEditableTarget = (target) => {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || target.isContentEditable;
};

const parseLevelsFromText = (text) => {
  const cleaned = String(text ?? '').replace(/\r/g, '');
  return cleaned
    .split(/\n\s*\n/)
    .map((lvl) => lvl.split('\n'))
    .filter((lvl) => lvl.some((line) => line.trim().length > 0));
};

const normalizeLevelLines = (level) => {
  if (!Array.isArray(level) || level.length === 0) return ['@'];
  return level.map((line) => (Array.isArray(line) ? line.join('') : String(line)));
};

const normalizeState = (level) => {
  const lines = normalizeLevelLines(level);
  const height = Math.max(lines.length, 1);
  const width = Math.max(
    1,
    ...lines.map((row) => row.length),
  );
  const board = Array.from({ length: height }, (_, y) =>
    Array.from({ length: width }, (_, x) => {
      const ch = lines[y]?.[x] ?? ' ';
      return VALID_TILES.has(ch) ? ch : ' ';
    }),
  );

  let player = null;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const cell = board[y][x];
      if (cell === '@' || cell === '+') {
        if (!player) {
          player = { x, y };
        } else {
          board[y][x] = cell === '+' ? '.' : ' ';
        }
      }
    }
  }

  if (!player) {
    let placed = false;
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        if (board[y][x] !== '#') {
          board[y][x] = board[y][x] === '.' ? '+' : '@';
          player = { x, y };
          placed = true;
          break;
        }
      }
      if (placed) break;
    }
    if (!player) {
      board[0][0] = '@';
      player = { x: 0, y: 0 };
    }
  }

  return { board, player, moves: 0, pushes: 0 };
};

const cloneState = (state) => ({
  board: state.board.map((row) => row.slice()),
  player: { ...state.player },
  moves: state.moves,
  pushes: state.pushes,
});

const attemptMove = (state, dx, dy) => {
  const { board, player } = state;
  const height = board.length;
  const width = board[0].length;
  const getCell = (x, y) =>
    y >= 0 && y < height && x >= 0 && x < width ? board[y][x] : '#';

  const targetX = player.x + dx;
  const targetY = player.y + dy;
  const beyondX = player.x + 2 * dx;
  const beyondY = player.y + 2 * dy;
  const target = getCell(targetX, targetY);
  const beyond = getCell(beyondX, beyondY);
  if (target === '#') return null;

  const newBoard = board.map((r) => r.slice());
  const newPlayer = { ...player };

  const replacePlayerTile = () => {
    newBoard[player.y][player.x] = newBoard[player.y][player.x] === '+' ? '.' : ' ';
  };

  let push = false;
  if (target === ' ' || target === '.') {
    replacePlayerTile();
    newBoard[targetY][targetX] = target === '.' ? '+' : '@';
    newPlayer.x = targetX;
    newPlayer.y = targetY;
  } else if (target === '$' || target === '*') {
    if (beyond === ' ' || beyond === '.') {
      replacePlayerTile();
      newBoard[targetY][targetX] = target === '*' ? '+' : '@';
      newBoard[beyondY][beyondX] = beyond === '.' ? '*' : '$';
      newPlayer.x = targetX;
      newPlayer.y = targetY;
      push = true;
    } else {
      return null;
    }
  } else {
    return null;
  }

  return { board: newBoard, player: newPlayer, push };
};

const checkWin = (board) => !board.some((row) => row.includes('$'));

const getPackSignature = (levels) => {
  const text = levels.map((lvl) => normalizeLevelLines(lvl).join('\n')).join('\n\n');
  let hash = 0;
  for (let i = 0; i < text.length; i++) {
    hash = (hash * 31 + text.charCodeAt(i)) | 0;
  }
  return `pack-${Math.abs(hash)}`;
};

const Sokoban = () => {
  const rawLevels = Array.isArray(levelPack?.levels)
    ? levelPack.levels
    : parseLevelsFromText(levelPack);
  const initialLevels = rawLevels.length > 0 ? rawLevels : [['@']];
  const initialState = normalizeState(initialLevels[0]);

  const canvasRef = useRef(null);
  const stateRef = useRef(initialState);
  const historyRef = useRef([cloneState(initialState)]);
  const historyIndexRef = useRef(0);
  const winRef = useRef(false);
  const liveRef = useRef(null);
  const sliderRaf = useRef(null);

  const [levels, setLevels] = useState(initialLevels);
  const [levelIndex, setLevelIndex] = useState(0);
  const [state, setState] = useState(initialState);
  const [historyIndex, setHistoryIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [best, setBest] = useState(null);
  const [showWin, setShowWin] = useState(false);
  const [soundEnabled, setSoundEnabled] = usePersistedState('sokoban:sound', true);
  const [tileSize, setTileSize] = usePersistedState('sokoban:tileSize', TILE_DEFAULT);

  const packId = useMemo(() => getPackSignature(levels), [levels]);

  stateRef.current = state;

  const updateHistoryIndex = useCallback((idx) => {
    historyIndexRef.current = idx;
    setHistoryIndex(idx);
  }, []);

  const progressKey = useCallback(
    (idx) => `sokoban:${packId}:progress:${idx}`,
    [packId],
  );

  const bestKey = useCallback(
    (idx) => `sokoban:${packId}:best:${idx}`,
    [packId],
  );

  const announce = useCallback((message) => {
    if (liveRef.current) {
      liveRef.current.textContent = message;
    }
  }, []);

  const loadBest = useCallback(
    (idx) => {
      try {
        const b = localStorage.getItem(bestKey(idx));
        setBest(b ? JSON.parse(b) : null);
      } catch {
        setBest(null);
      }
    },
    [bestKey],
  );

  const saveProgress = useCallback(
    (idx, st) => {
      try {
        localStorage.setItem(
          progressKey(idx),
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
    },
    [progressKey],
  );

  const loadState = useCallback(
    (idx, lvls) => {
      try {
        const saved = localStorage.getItem(progressKey(idx));
        if (saved) {
          const data = JSON.parse(saved);
          const restored = normalizeState(data.board);
          return {
            ...restored,
            moves: data.moves || 0,
            pushes: data.pushes || 0,
          };
        }
      } catch {
        // ignore parse errors
      }
      return normalizeState(lvls[idx]);
    },
    [progressKey],
  );

  const resetHistory = useCallback(
    (nextState) => {
      const snapshot = cloneState(nextState);
      historyRef.current = [snapshot];
      updateHistoryIndex(0);
    },
    [updateHistoryIndex],
  );

  const playBeep = useCallback(() => {
    if (!soundEnabled) return;
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = 440;
      gain.gain.value = 0.2;
      osc.start();
      osc.stop(ctx.currentTime + 0.05);
    } catch {
      // ignore audio errors
    }
  }, [soundEnabled]);

  useEffect(() => {
    loadBest(levelIndex);
  }, [levelIndex, loadBest]);

  useEffect(() => {
    const st = loadState(levelIndex, levels);
    setState(st);
    resetHistory(st);
    setShowWin(false);
    winRef.current = false;
  }, [levelIndex, levels, loadState, resetHistory]);

  const pushHistory = useCallback(
    (nextState) => {
      const capped = historyRef.current.slice(0, historyIndexRef.current + 1);
      capped.push(cloneState(nextState));
      if (capped.length > MAX_HISTORY) {
        const overflow = capped.length - MAX_HISTORY;
        capped.splice(0, overflow);
        historyIndexRef.current = Math.max(0, historyIndexRef.current - overflow);
      }
      historyRef.current = capped;
      updateHistoryIndex(capped.length - 1);
    },
    [updateHistoryIndex],
  );

  const move = useCallback(
    ({ x, y }) => {
      if (paused || showWin) return;
      const res = attemptMove(stateRef.current, x, y);
      if (!res) return;
      const nextState = {
        board: res.board,
        player: res.player,
        moves: stateRef.current.moves + 1,
        pushes: stateRef.current.pushes + (res.push ? 1 : 0),
      };
      pushHistory(nextState);
      setState(nextState);
      playBeep();
      announce(`Move ${nextState.moves}, pushes ${nextState.pushes}.`);
    },
    [announce, paused, playBeep, pushHistory, showWin],
  );

  useGameControls(move, 'sokoban');

  useEffect(() => {
    if (!checkWin(state.board)) saveProgress(levelIndex, state);
  }, [state, levelIndex, saveProgress]);

  useEffect(() => {
    const won = checkWin(state.board);
    if (won && !winRef.current) {
      winRef.current = true;
      setShowWin(true);
      const currentBest = best || null;
      if (
        !currentBest ||
        state.moves < currentBest.moves ||
        (state.moves === currentBest.moves && state.pushes < currentBest.pushes)
      ) {
        try {
          localStorage.setItem(
            bestKey(levelIndex),
            JSON.stringify({ moves: state.moves, pushes: state.pushes }),
          );
        } catch {
          // ignore storage errors
        }
        setBest({ moves: state.moves, pushes: state.pushes });
      }
      try {
        localStorage.removeItem(progressKey(levelIndex));
      } catch {
        // ignore storage errors
      }
      announce(`Level complete in ${state.moves} moves.`);
    }
    if (!won) {
      winRef.current = false;
      setShowWin(false);
    }
  }, [announce, best, bestKey, levelIndex, progressKey, state]);

  const drawBoard = useCallback(
    (boardState) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      const { board } = boardState;
      const height = board.length;
      const width = board[0].length;
      const dpr = window.devicePixelRatio || 1;
      const renderSize = Math.max(16, Math.min(64, tileSize));
      canvas.width = width * renderSize * dpr;
      canvas.height = height * renderSize * dpr;
      canvas.style.width = `${width * renderSize}px`;
      canvas.style.height = `${height * renderSize}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          const cell = board[y][x];
          const px = x * renderSize;
          const py = y * renderSize;

          if (cell === '#') {
            ctx.fillStyle = '#2d3748';
            ctx.fillRect(px, py, renderSize, renderSize);
            ctx.fillStyle = '#4a5568';
            ctx.fillRect(px + 2, py + 2, renderSize - 4, renderSize - 4);
          } else {
            ctx.fillStyle = '#1f2937';
            ctx.fillRect(px, py, renderSize, renderSize);
            ctx.fillStyle = '#111827';
            ctx.fillRect(px + 1, py + 1, renderSize - 2, renderSize - 2);
          }

          if (cell === '.' || cell === '+' || cell === '*') {
            ctx.fillStyle = '#fbbf24';
            ctx.beginPath();
            ctx.arc(
              px + renderSize / 2,
              py + renderSize / 2,
              renderSize / 6,
              0,
              Math.PI * 2,
            );
            ctx.fill();
          }

          if (cell === '$' || cell === '*') {
            ctx.fillStyle = '#c05621';
            ctx.fillRect(px + 4, py + 4, renderSize - 8, renderSize - 8);
            ctx.fillStyle = '#ed8936';
            ctx.fillRect(px + 6, py + 6, renderSize - 12, renderSize - 12);
          }

          if (cell === '@' || cell === '+') {
            ctx.fillStyle = '#38bdf8';
            ctx.beginPath();
            ctx.arc(
              px + renderSize / 2,
              py + renderSize / 2,
              renderSize / 3.2,
              0,
              Math.PI * 2,
            );
            ctx.fill();
            ctx.fillStyle = '#0ea5e9';
            ctx.beginPath();
            ctx.arc(
              px + renderSize / 2,
              py + renderSize / 2,
              renderSize / 5.5,
              0,
              Math.PI * 2,
            );
            ctx.fill();
          }
        }
      }
    },
    [tileSize],
  );

  useEffect(() => {
    drawBoard(state);
  }, [drawBoard, state]);

  const undo = useCallback(() => {
    const nextIndex = Math.max(0, historyIndexRef.current - 1);
    if (nextIndex === historyIndexRef.current) return;
    updateHistoryIndex(nextIndex);
    setState(historyRef.current[nextIndex]);
    announce(`Undo to move ${nextIndex}.`);
  }, [announce, updateHistoryIndex]);

  const redo = useCallback(() => {
    const nextIndex = Math.min(historyRef.current.length - 1, historyIndexRef.current + 1);
    if (nextIndex === historyIndexRef.current) return;
    updateHistoryIndex(nextIndex);
    setState(historyRef.current[nextIndex]);
    announce(`Redo to move ${nextIndex}.`);
  }, [announce, updateHistoryIndex]);

  const reset = useCallback(() => {
    const st = normalizeState(levels[levelIndex]);
    setState(st);
    resetHistory(st);
    setShowWin(false);
    winRef.current = false;
    announce('Level reset.');
  }, [announce, levelIndex, levels, resetHistory]);

  const changeLevel = useCallback(
    (nextIndex) => {
      if (nextIndex < 0 || nextIndex >= levels.length) return;
      setLevelIndex(nextIndex);
      announce(`Loading level ${nextIndex + 1}.`);
    },
    [announce, levels.length],
  );

  const handleRewind = useCallback(
    (e) => {
      const idx = Number(e.target.value);
      const update = () => {
        updateHistoryIndex(idx);
        setState(historyRef.current[idx]);
        announce(`Rewind to move ${idx}.`);
      };
      cancelAnimationFrame(sliderRaf.current);
      sliderRaf.current = requestAnimationFrame(update);
    },
    [announce, updateHistoryIndex],
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
            announce(`Imported ${parsed.length} levels.`);
          }
        } catch {
          announce('Failed to import levels.');
        }
      };
      reader.readAsText(file);
    },
    [announce],
  );

  const exportLevels = useCallback(() => {
    const text = levels.map((l) => normalizeLevelLines(l).join('\n')).join('\n\n');
    try {
      const blob = new Blob([text], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'sokoban_levels.txt';
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      announce('Export failed.');
    }
  }, [announce, levels]);

  const clearProgress = useCallback(() => {
    try {
      levels.forEach((_, idx) => {
        localStorage.removeItem(progressKey(idx));
        localStorage.removeItem(bestKey(idx));
      });
      setBest(null);
      announce('Cleared saved progress.');
    } catch {
      announce('Unable to clear progress.');
    }
  }, [announce, bestKey, levels, progressKey]);

  useEffect(() => {
    const handler = (e) => {
      if (isEditableTarget(e.target)) return;
      if (e.key === 'u' || e.key === 'U' || e.key === 'z' || e.key === 'Z') {
        e.preventDefault();
        undo();
      } else if (e.key === 'Backspace') {
        e.preventDefault();
        undo();
      } else if (e.key === 'y' || e.key === 'Y') {
        e.preventDefault();
        redo();
      } else if (e.key === 'r' || e.key === 'R') {
        e.preventDefault();
        reset();
      } else if (e.key === 'n' || e.key === 'N' || e.key === 'PageDown') {
        e.preventDefault();
        changeLevel(levelIndex + 1);
      } else if (e.key === 'p' || e.key === 'P' || e.key === 'PageUp') {
        e.preventDefault();
        changeLevel(levelIndex - 1);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [changeLevel, levelIndex, redo, reset, undo]);

  const settingsPanel = (
    <div className="space-y-3 text-sm text-slate-100">
      <div className="flex items-center justify-between gap-2">
        <span>Sound</span>
        <button
          type="button"
          onClick={() => setSoundEnabled((s) => !s)}
          className="px-2 py-1 rounded bg-slate-700 text-white"
          aria-label="Toggle sound"
        >
          {soundEnabled ? 'On' : 'Off'}
        </button>
      </div>
      <label className="flex flex-col gap-1" htmlFor="sokoban-zoom">
        <span>Tile Size</span>
        <input
          id="sokoban-zoom"
          type="range"
          min="20"
          max="56"
          step="2"
          value={tileSize}
          onChange={(e) => setTileSize(Number(e.target.value))}
          className="accent-blue-500"
        />
      </label>
      <div className="flex flex-col gap-2">
        <button
          type="button"
          onClick={exportLevels}
          className="px-2 py-1 rounded bg-slate-700 text-white"
        >
          Export Levels
        </button>
        <label className="flex flex-col gap-1 text-xs">
          <span>Import Levels</span>
          <input
            type="file"
            accept=".txt,.json"
            onChange={handleFile}
            className="text-xs text-slate-200"
            aria-label="Import levels file"
          />
        </label>
        <button
          type="button"
          onClick={clearProgress}
          className="px-2 py-1 rounded bg-red-600 text-white"
        >
          Clear Progress
        </button>
      </div>
    </div>
  );

  return (
    <GameLayout
      gameId="sokoban"
      stage={levelIndex + 1}
      onRestart={reset}
      onPauseChange={setPaused}
      settingsPanel={settingsPanel}
    >
      <div className="flex flex-col items-center gap-3 px-2">
        <canvas
          ref={canvasRef}
          className="mx-auto bg-slate-800 rounded"
          role="img"
          aria-label="Sokoban board"
        />
        <div className="flex flex-wrap items-center justify-center gap-2 text-sm text-white">
          <label className="flex items-center gap-2">
            <span>Level</span>
            <select
              value={levelIndex}
              onChange={(e) => changeLevel(Number(e.target.value))}
              className="rounded bg-slate-800 px-2 py-1"
              aria-label="Select level"
            >
              {levels.map((_, i) => (
                <option key={i} value={i}>{`Level ${i + 1}`}</option>
              ))}
            </select>
          </label>
          <button
            className="px-2 py-1 bg-slate-700 text-white rounded"
            onClick={undo}
            aria-label="Undo move"
          >
            Undo
          </button>
          <button
            className="px-2 py-1 bg-slate-700 text-white rounded"
            onClick={redo}
            aria-label="Redo move"
          >
            Redo
          </button>
          <button
            className="px-2 py-1 bg-slate-700 text-white rounded"
            onClick={reset}
            aria-label="Reset level"
          >
            Reset
          </button>
          <label className="flex items-center gap-2">
            <span className="sr-only">Rewind moves</span>
            <input
              type="range"
              min="0"
              max={historyRef.current.length - 1}
              value={historyIndex}
              onChange={handleRewind}
              className="w-32 accent-blue-500 bg-gray-600"
              aria-label="Rewind moves"
            />
          </label>
          <div aria-live="polite" aria-atomic="true" className="text-xs">
            Moves: {state.moves} | Pushes: {state.pushes}
          </div>
          <div className="text-xs">
            Best: {best ? `${best.moves}/${best.pushes}` : '-'}
            {best && checkWin(state.board) && state.moves === best.moves && state.pushes === best.pushes && (
              <span className="ml-1 text-emerald-300">Optimal!</span>
            )}
          </div>
        </div>
        <div ref={liveRef} aria-live="polite" aria-atomic="true" className="sr-only" />
      </div>
      {showWin && (
        <div
          className="absolute inset-0 z-50 flex items-center justify-center bg-black/80 text-white"
          role="dialog"
          aria-modal="true"
          aria-label="Level complete"
        >
          <div className="max-w-sm rounded-lg bg-slate-900 p-6 text-center shadow-xl">
            <h2 className="text-xl font-semibold">Level Complete</h2>
            <p className="mt-2 text-sm text-slate-200">
              Moves: {state.moves} | Pushes: {state.pushes}
            </p>
            {best && (
              <p className="mt-1 text-xs text-emerald-200">
                Best: {best.moves}/{best.pushes}
              </p>
            )}
            <div className="mt-4 flex flex-col gap-2">
              {levelIndex < levels.length - 1 && (
                <button
                  type="button"
                  className="rounded bg-emerald-600 px-3 py-2 text-white"
                  onClick={() => {
                    setShowWin(false);
                    changeLevel(levelIndex + 1);
                  }}
                >
                  Next Level
                </button>
              )}
              <button
                type="button"
                className="rounded bg-slate-700 px-3 py-2 text-white"
                onClick={() => {
                  setShowWin(false);
                  reset();
                }}
              >
                Restart Level
              </button>
              <button
                type="button"
                className="rounded bg-slate-600 px-3 py-2 text-white"
                onClick={() => setShowWin(false)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </GameLayout>
  );
};

export default Sokoban;
