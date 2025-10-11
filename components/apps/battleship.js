import React, {
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
} from 'react';
import Draggable from 'react-draggable';
import {
  MonteCarloAI,
  RandomSalvoAI,
  RandomAI,
  BOARD_SIZE,
  randomizePlacement,
} from '../../apps/games/battleship/ai';
import { fireShots } from '../../apps/games/battleship/logic';
import GameShell from './GameLayout';
import ControlPanel from './battleship/GameLayout';
import usePersistentState from '../../hooks/usePersistentState';
import useGameControls from './useGameControls';
import usePrefersReducedMotion from '../../hooks/usePrefersReducedMotion';
import { Overlay, useGameLoop } from './Games/common';
import {
  expandLayout,
  serializeShips,
  isValidLayout,
} from '../../apps/games/battleship/state';

const CELL = 32;
const BOARD_CELLS = BOARD_SIZE * BOARD_SIZE;
const DIFFICULTIES = ['easy', 'medium', 'hard'];

const createBoard = () => Array(BOARD_CELLS).fill(null);

const createStats = () => ({
  overall: { wins: 0, losses: 0 },
  byDifficulty: DIFFICULTIES.reduce(
    (acc, key) => ({ ...acc, [key]: { wins: 0, losses: 0 } }),
    {},
  ),
});

const normalizeStats = (stats) => {
  if (!stats || typeof stats !== 'object') return createStats();
  if (typeof stats.wins === 'number' || typeof stats.losses === 'number') {
    const legacy = createStats();
    legacy.overall.wins = Number.isFinite(stats.wins) ? stats.wins : 0;
    legacy.overall.losses = Number.isFinite(stats.losses) ? stats.losses : 0;
    return legacy;
  }
  const normalized = createStats();
  const overall = stats.overall ?? {};
  normalized.overall.wins = Number.isFinite(overall.wins)
    ? overall.wins
    : normalized.overall.wins;
  normalized.overall.losses = Number.isFinite(overall.losses)
    ? overall.losses
    : normalized.overall.losses;
  if (stats.byDifficulty && typeof stats.byDifficulty === 'object') {
    DIFFICULTIES.forEach((key) => {
      const entry = stats.byDifficulty[key];
      if (entry && typeof entry === 'object') {
        normalized.byDifficulty[key] = {
          wins: Number.isFinite(entry.wins) ? entry.wins : 0,
          losses: Number.isFinite(entry.losses) ? entry.losses : 0,
        };
      }
    });
  }
  return normalized;
};

const layoutValidator = (value) => value === null || isValidLayout(value);

const Splash = ({ color }) => {
  const prefersReduced = usePrefersReducedMotion();
  if (prefersReduced) return null;
  return (
    <span
      className={`absolute inset-0 rounded-full pointer-events-none ${color}`}
      style={{ animation: 'ping 0.6s cubic-bezier(0,0,0.2,1) forwards', opacity: 0.5 }}
      aria-hidden="true"
    />
  );
};

const HitMarker = ({ colorblind }) => (
  <div className="absolute inset-0">
    <Splash color={colorblind ? 'bg-blue-500' : 'bg-red-500'} />
    <svg
      className="w-full h-full"
      viewBox="0 0 32 32"
      stroke={colorblind ? 'blue' : 'red'}
      strokeWidth="4"
      aria-hidden="true"
    >
      <line x1="4" y1="4" x2="28" y2="28">
        <animate attributeName="stroke-opacity" from="0" to="1" dur="0.2s" fill="freeze" />
      </line>
      <line x1="28" y1="4" x2="4" y2="28">
        <animate attributeName="stroke-opacity" from="0" to="1" dur="0.2s" fill="freeze" />
      </line>
    </svg>
  </div>
);

const MissMarker = ({ colorblind }) => (
  <div className="absolute inset-0">
    <Splash color={colorblind ? 'bg-orange-400' : 'bg-blue-300'} />
    <svg
      className="w-full h-full"
      viewBox="0 0 32 32"
      stroke={colorblind ? 'orange' : 'white'}
      strokeWidth="3"
      fill="none"
      aria-hidden="true"
    >
      <circle cx="16" cy="16" r="10" opacity="1">
        <animate attributeName="r" from="0" to="10" dur="0.2s" fill="freeze" />
        <animate attributeName="stroke-opacity" from="0" to="1" dur="0.2s" fill="freeze" />
      </circle>
    </svg>
  </div>
);

const Battleship = () => {
  const prefersReduced = usePrefersReducedMotion();
  const [phase, setPhase] = useState('placement');
  const [playerBoard, setPlayerBoard] = useState(createBoard());
  const [enemyBoard, setEnemyBoard] = useState(createBoard());
  const [ships, setShips] = useState([]);
  const [enemyShips, setEnemyShips] = useState([]);
  const [aiHeat, setAiHeat] = useState(Array(BOARD_CELLS).fill(0));
  const [guessHeat, setGuessHeat] = useState(Array(BOARD_CELLS).fill(0));
  const [showHeatmap, setShowHeatmap] = useState(false);
  const [message, setMessage] = useState('Place your ships');
  const [difficulty, setDifficulty] = useState('easy');
  const [ai, setAi] = useState(null);
  const [playerAi, setPlayerAi] = useState(null);
  const [salvo, setSalvo] = useState(false);
  const [fog, setFog] = useState(false);
  const [playerShots, setPlayerShots] = useState(1);
  const [aiShots, setAiShots] = useState(1);
  const [selected, setSelected] = useState([]);
  const [rawStats, setRawStats] = usePersistentState(
    'battleship-stats',
    createStats,
  );
  const stats = useMemo(() => normalizeStats(rawStats), [rawStats]);
  const [savedLayout, setSavedLayout] = usePersistentState(
    'battleship:layout',
    null,
    layoutValidator,
  );
  const [muted, setMuted] = usePersistentState(
    'battleship:muted',
    false,
    (value) => typeof value === 'boolean',
  );
  const [colorblind, setColorblind] = usePersistentState(
    'battleship-colorblind',
    false,
  );
  const [dragHint, setDragHint] = useState(null);
  const [cursor, setCursor] = useState(0);
  const [paused, setPaused] = useState(false);
  const [pulse, setPulse] = useState(0);

  const savedLayoutRef = useRef(savedLayout);
  useEffect(() => {
    savedLayoutRef.current = savedLayout;
  }, [savedLayout]);

  const lastMessageRef = useRef('Place your ships');
  useEffect(() => {
    if (message !== 'Paused') {
      lastMessageRef.current = message;
    }
  }, [message]);

  const updateStats = useCallback(
    (didWin) => {
      setRawStats((prev) => {
        const base = normalizeStats(prev);
        const next = {
          overall: {
            wins: base.overall.wins + (didWin ? 1 : 0),
            losses: base.overall.losses + (didWin ? 0 : 1),
          },
          byDifficulty: {
            easy: { ...base.byDifficulty.easy },
            medium: { ...base.byDifficulty.medium },
            hard: { ...base.byDifficulty.hard },
          },
        };
        const bucket = next.byDifficulty[difficulty];
        bucket.wins += didWin ? 1 : 0;
        bucket.losses += didWin ? 0 : 1;
        return next;
      });
    },
    [setRawStats, difficulty],
  );

  const pauseGame = useCallback(() => {
    setPaused(true);
    setMessage((prev) => {
      if (prev !== 'Paused') {
        lastMessageRef.current = prev;
      }
      return 'Paused';
    });
  }, []);

  const resumeGame = useCallback(() => {
    setPaused(false);
    setMessage(lastMessageRef.current);
  }, []);

  const audioCtxRef = useRef(null);
  const playTone = useCallback(
    (freq) => {
      if (muted || typeof window === 'undefined') return;
      try {
        const Ctx = window.AudioContext || window.webkitAudioContext;
        if (!Ctx) return;
        const ctx = audioCtxRef.current || new Ctx();
        audioCtxRef.current = ctx;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(0.18, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(
          0.001,
          ctx.currentTime + 0.25,
        );
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.25);
      } catch {
        /* ignore audio failures */
      }
    },
    [muted],
  );

  useGameLoop(
    (delta) => {
      setPulse((p) => {
        const next = p + delta * Math.PI * 2;
        return next > Math.PI * 2 ? next - Math.PI * 2 : next;
      });
    },
    !paused && phase === 'battle' && !prefersReduced,
  );

  useEffect(() => {
    if (paused) {
      setPulse(0);
    }
  }, [paused]);

  const placeShips = useCallback((board, layout) => {
    const newBoard = board.slice();
    layout.forEach((ship) => ship.cells.forEach((c) => (newBoard[c] = 'ship')));
    return newBoard;
  }, []);

  const countRemaining = useCallback(
    (board, layout) =>
      layout.filter((sh) => sh.cells.some((c) => board[c] === 'ship')).length,
    [],
  );

  const persistLayout = useCallback(
    (currentShips) => {
      if (!currentShips?.length) return;
      if (currentShips.some((ship) => !ship.cells || ship.cells.length !== ship.len)) {
        return;
      }
      const stored = serializeShips(currentShips);
      if (isValidLayout(stored)) {
        setSavedLayout(stored);
      }
    },
    [setSavedLayout],
  );

  const restart = useCallback(
    (
      diff = difficulty,
      options = { useStored: true, persist: true },
    ) => {
      const { useStored = true, persist = true } = options;
      const storedLayout =
        useStored && savedLayoutRef.current && isValidLayout(savedLayoutRef.current)
          ? expandLayout(savedLayoutRef.current)
          : null;
      const playerLayout = (storedLayout || randomizePlacement(true)).map(
        (ship, i) => ({ ...ship, id: i }),
      );
      const enemyLayout = randomizePlacement(true).map((ship, i) => ({
        ...ship,
        id: i,
      }));

      setShips(playerLayout);
      setEnemyShips(enemyLayout);
      setPlayerBoard(placeShips(createBoard(), playerLayout));
      setEnemyBoard(placeShips(createBoard(), enemyLayout));
      setPhase('placement');
      setSelected([]);
      setCursor(0);
      setDragHint(null);
      setPaused(false);
      setMessage('Place your ships');
      lastMessageRef.current = 'Place your ships';

      let aiInstance;
      if (diff === 'hard') aiInstance = new MonteCarloAI();
      else if (diff === 'medium') aiInstance = new RandomSalvoAI();
      else aiInstance = new RandomAI();
      setAi(aiInstance);
      if (typeof aiInstance.getHeatmap === 'function') {
        aiInstance.nextMove();
        setAiHeat(aiInstance.getHeatmap().slice());
      } else {
        setAiHeat(Array(BOARD_CELLS).fill(0));
      }
      const playerAiInstance = new MonteCarloAI();
      playerAiInstance.nextMove();
      setPlayerAi(playerAiInstance);
      setGuessHeat(playerAiInstance.getHeatmap().slice());

      const initialPlayerShots = salvo ? playerLayout.length : 1;
      const initialAiShots = salvo ? enemyLayout.length : 1;
      setPlayerShots(initialPlayerShots);
      setAiShots(initialAiShots);

      if (persist) {
        persistLayout(playerLayout);
      }
    },
    [difficulty, persistLayout, placeShips, salvo],
  );

  useEffect(() => {
    restart();
    // run once on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const tryPlace = useCallback(
    (shipId, x, y, dir) => {
      const ship = ships.find((s) => s.id === shipId);
      if (!ship) return null;
      const cells = [];
      for (let k = 0; k < ship.len; k += 1) {
        const cx = x + (dir === 0 ? k : 0);
        const cy = y + (dir === 1 ? k : 0);
        if (cx < 0 || cy < 0 || cx >= BOARD_SIZE || cy >= BOARD_SIZE) return null;
        const idx = cy * BOARD_SIZE + cx;
        for (const s of ships) {
          if (s.id !== shipId && s.cells && s.cells.includes(idx)) return null;
        }
        cells.push(idx);
      }
      for (const idx of cells) {
        const cx = idx % BOARD_SIZE;
        const cy = Math.floor(idx / BOARD_SIZE);
        for (let dx = -1; dx <= 1; dx += 1) {
          for (let dy = -1; dy <= 1; dy += 1) {
            if (dx === 0 && dy === 0) continue;
            const nx = cx + dx;
            const ny = cy + dy;
            if (nx < 0 || ny < 0 || nx >= BOARD_SIZE || ny >= BOARD_SIZE) continue;
            const nIdx = ny * BOARD_SIZE + nx;
            for (const s of ships) {
              if (s.id !== shipId && s.cells && s.cells.includes(nIdx)) return null;
            }
          }
        }
      }
      return cells;
    },
    [ships],
  );

  const getDragCells = useCallback((ship, x, y) => {
    const cells = [];
    for (let k = 0; k < ship.len; k += 1) {
      const cx = x + (ship.dir === 0 ? k : 0);
      const cy = y + (ship.dir === 1 ? k : 0);
      if (cx < 0 || cy < 0 || cx >= BOARD_SIZE || cy >= BOARD_SIZE) continue;
      cells.push(cy * BOARD_SIZE + cx);
    }
    return cells;
  }, []);

  const handleDrag = useCallback(
    (i, e, data) => {
      if (paused || phase !== 'placement') return;
      const x = Math.round(data.x / CELL);
      const y = Math.round(data.y / CELL);
      const ship = ships[i];
      const cells = tryPlace(ship.id, x, y, ship.dir);
      if (cells) setDragHint({ cells, valid: true });
      else setDragHint({ cells: getDragCells(ship, x, y), valid: false });
    },
    [getDragCells, paused, phase, ships, tryPlace],
  );

  const handleDragStop = useCallback(
    (i, e, data) => {
      if (paused || phase !== 'placement') return;
      const x = Math.round(data.x / CELL);
      const y = Math.round(data.y / CELL);
      const ship = ships[i];
      const cells = tryPlace(ship.id, x, y, ship.dir);
      if (cells) {
        const updated = ships.map((s) =>
          s.id === ship.id ? { ...s, x, y, cells } : s,
        );
        setShips(updated);
        setPlayerBoard(placeShips(createBoard(), updated));
        persistLayout(updated);
      }
      setDragHint(null);
    },
    [paused, phase, placeShips, persistLayout, ships, tryPlace],
  );

  const rotateShip = useCallback(
    (id) => {
      if (paused || phase !== 'placement') return;
      const ship = ships.find((s) => s.id === id);
      if (!ship) return;
      const newDir = ship.dir === 0 ? 1 : 0;
      const x = ship.x || 0;
      const y = ship.y || 0;
      const cells = tryPlace(id, x, y, newDir);
      if (!cells) return;
      const updated = ships.map((s) =>
        s.id === id ? { ...s, dir: newDir, cells } : s,
      );
      setShips(updated);
      setPlayerBoard(placeShips(createBoard(), updated));
      persistLayout(updated);
    },
    [paused, phase, placeShips, persistLayout, ships, tryPlace],
  );

  const randomize = useCallback(() => {
    if (paused || phase !== 'placement') return;
    const layout = randomizePlacement(true);
    const newShips = layout.map((s, i) => ({ ...s, id: i }));
    setShips(newShips);
    setPlayerBoard(placeShips(createBoard(), newShips));
    setDragHint(null);
    persistLayout(newShips);
  }, [paused, phase, placeShips, persistLayout]);

  const start = useCallback(() => {
    if (phase !== 'placement') return;
    if (ships.some((s) => !s.cells)) {
      setMessage('Place all ships');
      return;
    }
    persistLayout(ships);
    setPhase('battle');
    if (salvo) {
      setPlayerShots(countRemaining(playerBoard, ships));
      setAiShots(countRemaining(enemyBoard, enemyShips));
    } else {
      setPlayerShots(1);
      setAiShots(1);
    }
    setPaused(false);
    setMessage('Your turn');
    lastMessageRef.current = 'Your turn';
  }, [countRemaining, enemyBoard, enemyShips, persistLayout, phase, playerBoard, ships, salvo]);

  const aiTurn = useCallback(
    (shots, playerHit, enemyBoardState = enemyBoard) => {
      let pb = playerBoard.slice();
      let heat = aiHeat.slice();
      for (let s = 0; s < shots; s += 1) {
        const move = ai.nextMove();
        if (move == null) break;
        if (typeof ai.getHeatmap === 'function') {
          heat = ai.getHeatmap().slice();
        } else {
          heat[move] = (heat[move] || 0) + 1;
        }
        const hitShip = pb[move] === 'ship';
        pb[move] = hitShip ? 'hit' : 'miss';
        playTone(hitShip ? 360 : 160);
        ai.record(move, hitShip);
        if (!pb.includes('ship')) {
          setPlayerBoard(pb);
          setAiHeat(heat);
          setMessage('AI wins!');
          setPhase('done');
          updateStats(false);
          return;
        }
      }
      if (typeof ai.getHeatmap === 'function') {
        ai.nextMove();
        heat = ai.getHeatmap().slice();
      }
      setPlayerBoard(pb);
      setAiHeat(heat);
      if (salvo) {
        setAiShots(countRemaining(enemyBoardState, enemyShips));
        setPlayerShots(countRemaining(pb, ships));
      } else if (pb.includes('ship')) {
        setPlayerShots(1);
      }
      setMessage(playerHit ? 'Hit!' : 'Miss!');
    },
    [ai, aiHeat, countRemaining, enemyBoard, enemyShips, playTone, playerBoard, salvo, ships, updateStats],
  );

  const toggleSelect = useCallback(
    (idx) => {
      if (phase !== 'battle' || enemyBoard[idx] || paused || playerShots === 0)
        return;
      setSelected((sel) => {
        if (sel.includes(idx)) return sel.filter((s) => s !== idx);
        if (sel.length >= playerShots) return sel;
        return [...sel, idx];
      });
    },
    [enemyBoard, paused, phase, playerShots],
  );

  const fireSelected = useCallback(() => {
    if (phase !== 'battle' || !selected.length || paused) return;
    const hit = selected.some((i) => enemyBoard[i] === 'ship');
    const { board: newBoard } = fireShots(enemyBoard, selected);
    setEnemyBoard(newBoard);
    playTone(hit ? 880 : 220);
    if (playerAi) {
      selected.forEach((idx) => {
        const wasHit = enemyBoard[idx] === 'ship';
        playerAi.record(idx, wasHit);
      });
      playerAi.nextMove();
      setGuessHeat(playerAi.getHeatmap().slice());
    }
    setSelected([]);
    setPlayerShots(0);
    if (!newBoard.includes('ship')) {
      setMessage('You win!');
      setPhase('done');
      updateStats(true);
      return;
    }
    const aiCount = salvo ? aiShots : 1;
    setTimeout(() => aiTurn(aiCount, hit, newBoard), 100);
  }, [aiShots, aiTurn, enemyBoard, paused, phase, playerAi, salvo, selected, updateStats, playTone]);

  useGameControls(({ x, y }) => {
    if (phase !== 'battle' || paused) return;
    setCursor((c) => {
      const cx = (c % BOARD_SIZE) + x;
      const cy = Math.floor(c / BOARD_SIZE) + y;
      if (cx < 0 || cy < 0 || cx >= BOARD_SIZE || cy >= BOARD_SIZE) return c;
      return cy * BOARD_SIZE + cx;
    });
  });

  useEffect(() => {
    const handleKey = (e) => {
      if (phase !== 'battle' || paused) return;
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        toggleSelect(cursor);
      } else if (e.key === 'f' || e.key === 'F') {
        e.preventDefault();
        fireSelected();
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [cursor, fireSelected, paused, phase, toggleSelect]);

  const highlightAlpha = useMemo(
    () => 0.35 + 0.25 * Math.sin(pulse),
    [pulse],
  );

  const renderBoard = useCallback(
    (board, opts = {}) => {
      const { isEnemy = false, hideInfo = false } = opts;
      const heatArr = isEnemy ? guessHeat : aiHeat;
      const maxHeat = Math.max(...heatArr);
      return (
        <div
          className="grid relative"
          style={{
            gridTemplateColumns: `repeat(${BOARD_SIZE}, ${CELL}px)`,
            gridTemplateRows: `repeat(${BOARD_SIZE}, ${CELL}px)`,
            background: 'linear-gradient(to bottom, #0e7490, #022c5a)',
          }}
        >
          {board.map((cell, idx) => {
            const heatVal = heatArr[idx];
            const norm = maxHeat ? heatVal / maxHeat : 0;
            const color = showHeatmap && heatVal
              ? isEnemy
                ? `rgba(0,150,255,${norm * 0.6})`
                : `rgba(255,0,0,${norm * 0.7})`
              : 'transparent';
            const selectedMark =
              isEnemy && phase === 'battle' && selected.includes(idx);
            const hint =
              !isEnemy && phase === 'placement' && dragHint && dragHint.cells.includes(idx);
            return (
              <div
                key={idx}
                className="border border-ub-dark-grey relative"
                style={{ width: CELL, height: CELL }}
              >
                {isEnemy && phase === 'battle' && !['hit', 'miss'].includes(cell) ? (
                  <button
                    className="w-full h-full"
                    onClick={() => toggleSelect(idx)}
                    aria-label={`select target at ${Math.floor(idx / BOARD_SIZE) + 1},${(idx % BOARD_SIZE) + 1}`}
                    disabled={paused || playerShots === 0}
                  />
                ) : null}
                {cell === 'hit' && !hideInfo && <HitMarker colorblind={colorblind} />}
                {cell === 'miss' && !hideInfo && <MissMarker colorblind={colorblind} />}
                <div className="absolute inset-0" style={{ background: color }} aria-hidden="true" />
                {hint && (
                  <div
                    className={`absolute inset-0 pointer-events-none ${
                      dragHint.valid ? 'bg-green-400' : 'bg-red-500'
                    } opacity-40`}
                  />
                )}
                {selectedMark && (
                  <div
                    className="absolute inset-0 pointer-events-none"
                    style={{ background: `rgba(253, 224, 71, ${highlightAlpha})` }}
                  />
                )}
                {hideInfo && phase === 'battle' && (
                  <div className="absolute inset-0 bg-gray-800" aria-hidden="true" />
                )}
                {isEnemy && phase === 'battle' && idx === cursor && (
                  <div className="absolute inset-0 border-2 border-yellow-300 pointer-events-none" />
                )}
              </div>
            );
          })}
        </div>
      );
    },
    [aiHeat, colorblind, cursor, dragHint, guessHeat, highlightAlpha, phase, playerShots, paused, selected, showHeatmap, toggleSelect],
  );

  const hasSavedLayout = Boolean(savedLayout);

  const handleRestoreLayout = useCallback(() => {
    if (!savedLayoutRef.current || !isValidLayout(savedLayoutRef.current)) return;
    restart(difficulty, { useStored: true });
  }, [difficulty, restart]);

  const handleClearLayout = useCallback(() => {
    setSavedLayout(null);
    restart(difficulty, { useStored: false, persist: false });
  }, [difficulty, restart, setSavedLayout]);

  return (
    <GameShell gameId="battleship" score={stats.overall.wins} highScore={stats.overall.wins}>
      <div className="relative h-full w-full">
        <Overlay
          onPause={pauseGame}
          onResume={resumeGame}
          onReset={() => restart(difficulty)}
          muted={muted}
          onToggleSound={setMuted}
        />
        <div className="h-full w-full flex flex-col items-center justify-start bg-ub-cool-grey text-white p-4 overflow-auto font-ubuntu">
          <ControlPanel
            difficulty={difficulty}
            onDifficultyChange={(d) => {
              setDifficulty(d);
              restart(d);
            }}
            onRestart={() => restart(difficulty)}
            stats={stats}
            showHeatmap={showHeatmap}
            onToggleHeatmap={() => setShowHeatmap((h) => !h)}
            salvo={salvo}
            onSalvoChange={(v) => {
              setSalvo(v);
              restart(difficulty);
            }}
            fog={fog}
            onFogChange={(v) => setFog(v)}
            colorblind={colorblind}
            onColorblindChange={(v) => setColorblind(v)}
            hasSavedLayout={hasSavedLayout}
            onRestoreLayout={hasSavedLayout ? handleRestoreLayout : undefined}
            onClearLayout={hasSavedLayout ? handleClearLayout : undefined}
          >
            <div className="mb-2" aria-live="polite" role="status">{message}</div>
            {phase === 'done' && (
              <button className="px-2 py-1 bg-gray-700 mb-2" onClick={() => restart(difficulty)}>
                Play Again
              </button>
            )}
            {phase === 'placement' && (
              <div className="flex space-x-4">
                <div className="relative border border-ub-dark-grey" style={{ width: BOARD_SIZE * CELL, height: BOARD_SIZE * CELL }}>
                  {renderBoard(playerBoard)}
                  {ships.map((ship, i) => (
                    <Draggable
                      key={ship.id}
                      grid={[CELL, CELL]}
                      position={{ x: (ship.x || 0) * CELL, y: (ship.y || 0) * CELL }}
                      onStart={(e, data) => handleDrag(i, e, data)}
                      onDrag={(e, data) => handleDrag(i, e, data)}
                      onStop={(e, data) => handleDragStop(i, e, data)}
                      disabled={phase !== 'placement'}
                    >
                      <div
                        className="absolute bg-blue-700 opacity-80"
                        style={{ width: (ship.dir === 0 ? ship.len : 1) * CELL, height: (ship.dir === 1 ? ship.len : 1) * CELL }}
                        onDoubleClick={() => rotateShip(ship.id)}
                      />
                    </Draggable>
                  ))}
                  {paused && (
                    <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center pointer-events-none">
                      Paused
                    </div>
                  )}
                </div>
                <div className="flex flex-col space-y-2">
                  <button className="px-2 py-1 bg-gray-700" onClick={randomize}>
                    Randomize
                  </button>
                  <button className="px-2 py-1 bg-gray-700" onClick={start}>
                    Start
                  </button>
                </div>
              </div>
            )}
            {phase !== 'placement' && (
              <div className="flex flex-col items-center">
                <div className="relative">
                  <div className="flex space-x-8">
                    <div>{renderBoard(playerBoard, { hideInfo: fog && phase === 'battle' })}</div>
                    <div>{renderBoard(enemyBoard, { isEnemy: true })}</div>
                  </div>
                  {paused && (
                    <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center pointer-events-none">
                      Paused
                    </div>
                  )}
                </div>
                {phase === 'battle' && (
                  <div className="mt-2 flex flex-col items-center">
                    <div className="mb-1">
                      Selected {selected.length}/{playerShots}
                    </div>
                    <button
                      className="px-2 py-1 bg-gray-700 disabled:opacity-50"
                      onClick={fireSelected}
                      disabled={!selected.length || paused}
                    >
                      Fire
                    </button>
                  </div>
                )}
              </div>
            )}
          </ControlPanel>
        </div>
      </div>
    </GameShell>
  );
};

export default Battleship;
