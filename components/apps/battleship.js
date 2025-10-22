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
import GameLayout from './battleship/GameLayout';
import usePersistentState from '../../hooks/usePersistentState';
import useGameControls from './useGameControls';
import usePrefersReducedMotion from '../../hooks/usePrefersReducedMotion';

const CELL = 32; // px

const SHIP_DEFS = [
  { id: 0, name: 'Carrier', len: 5 },
  { id: 1, name: 'Battleship', len: 4 },
  { id: 2, name: 'Cruiser', len: 3 },
  { id: 3, name: 'Submarine', len: 3 },
  { id: 4, name: 'Destroyer', len: 2 },
];

const createBoard = () => Array(BOARD_SIZE * BOARD_SIZE).fill(null);

const decorateShips = (layout) => {
  const pool = SHIP_DEFS.slice();
  return layout.map((ship) => {
    const matchIndex = pool.findIndex((item) => item.len === ship.len);
    const match = matchIndex >= 0 ? pool.splice(matchIndex, 1)[0] : pool.shift();
    return {
      ...ship,
      id: match?.id ?? ship.id ?? Math.random(),
      name: match?.name ?? `Ship ${ship.len}`,
    };
  });
};

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
  <div className="pointer-events-none absolute inset-0 z-10">
    <Splash color={colorblind ? 'bg-blue-500' : 'bg-red-500'} />
    <svg
      className="h-full w-full"
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
  <div className="pointer-events-none absolute inset-0 z-10">
    <Splash color={colorblind ? 'bg-orange-400' : 'bg-blue-300'} />
    <svg
      className="h-full w-full"
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

const ExplosionParticles = ({ colorblind }) => (
  <span className="shot-particles" aria-hidden="true">
    {Array.from({ length: 6 }).map((_, idx) => (
      <span
        key={idx}
        className={`particle particle-${idx}`}
        style={{
          background: colorblind ? '#60a5fa' : '#f87171',
        }}
      />
    ))}
  </span>
);

const WaterParticles = () => (
  <span className="shot-particles" aria-hidden="true">
    {Array.from({ length: 6 }).map((_, idx) => (
      <span key={idx} className={`particle particle-${idx}`} style={{ background: '#38bdf8' }} />
    ))}
  </span>
);

const ShotEffect = ({ outcome, colorblind, reduced }) => {
  if (reduced) {
    return (
      <div
        className={`pointer-events-none absolute inset-0 rounded-lg border-2 ${
          outcome === 'hit' ? 'border-red-400' : 'border-cyan-200'
        } opacity-80`}
        aria-hidden="true"
      />
    );
  }
  return (
    <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
      <span className="shot-trail" aria-hidden="true" />
      <span
        className={`shot-impact ${outcome === 'hit' ? 'shot-impact-hit' : 'shot-impact-miss'}`}
        aria-hidden="true"
      />
      {outcome === 'hit' ? <ExplosionParticles colorblind={colorblind} /> : <WaterParticles />}
    </div>
  );
};

const Confetti = ({ reduced }) => {
  if (reduced) return null;
  return (
    <div className="confetti-field" aria-hidden="true">
      {Array.from({ length: 24 }).map((_, idx) => (
        <span
          key={idx}
          className="confetti-piece"
          style={{
            '--offset': `${(idx % 12) * 8}px`,
            '--delay': `${(idx % 6) * 0.12}s`,
            '--duration': `${2 + (idx % 5) * 0.3}s`,
            background: idx % 2 ? '#38bdf8' : '#fbbf24',
          }}
        />
      ))}
    </div>
  );
};

const ResultModal = ({ type, onClose, onRestart, stats, reduced }) => (
  <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
    <div
      role="dialog"
      aria-modal="true"
      className="relative w-full max-w-md overflow-hidden rounded-3xl border border-cyan-400/40 bg-slate-950/95 p-6 shadow-[0_40px_80px_rgba(0,0,0,0.6)]"
    >
      {type === 'victory' ? <Confetti reduced={reduced} /> : null}
      <div className="relative space-y-4 text-center">
        <h2 className="text-3xl font-bold text-white">
          {type === 'victory' ? 'Victory Achieved!' : 'Defeat Recorded'}
        </h2>
        <p className="text-sm text-white/70">
          {type === 'victory'
            ? 'All enemy vessels have been destroyed. Bask in the glory of the fleet!'
            : 'Our hulls are breached. Regroup, rethink, and return fire next time.'}
        </p>
        {stats ? (
          <div className="flex items-center justify-center gap-6 text-white/80">
            <span>
              Wins: <strong className="text-white">{stats.wins}</strong>
            </span>
            <span>
              Losses: <strong className="text-white">{stats.losses}</strong>
            </span>
          </div>
        ) : null}
        <div className="flex flex-wrap items-center justify-center gap-3">
          <button
            type="button"
            className="rounded-full bg-gradient-to-br from-emerald-500 to-cyan-500 px-5 py-2 text-sm font-semibold uppercase tracking-wide text-white shadow-lg transition hover:from-emerald-400 hover:to-cyan-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-200"
            onClick={() => {
              onRestart();
              onClose();
            }}
          >
            Deploy Again
          </button>
          <button
            type="button"
            className="rounded-full border border-white/20 bg-slate-900/80 px-4 py-2 text-sm font-semibold uppercase tracking-wide text-white/80 transition hover:bg-slate-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300"
            onClick={onClose}
          >
            Close Briefing
          </button>
        </div>
      </div>
    </div>
  </div>
);

const Battleship = () => {
  const prefersReduced = usePrefersReducedMotion();
  const [phase, setPhase] = useState('placement');
  const [playerBoard, setPlayerBoard] = useState(createBoard());
  const [enemyBoard, setEnemyBoard] = useState(createBoard());
  const [ships, setShips] = useState([]);
  const [enemyShips, setEnemyShips] = useState([]);
  const [aiHeat, setAiHeat] = useState(Array(BOARD_SIZE * BOARD_SIZE).fill(0));
  const [guessHeat, setGuessHeat] = useState(Array(BOARD_SIZE * BOARD_SIZE).fill(0));
  const [showHeatmap, setShowHeatmap] = useState(false);
  const [message, setMessage] = useState('Place your ships');
  const [difficulty, setDifficulty] = usePersistentState('battleship-difficulty', 'easy');
  const [ai, setAi] = useState(null);
  const [playerAi, setPlayerAi] = useState(null);
  const [salvo, setSalvo] = usePersistentState('battleship-salvo', false);
  const [fog, setFog] = usePersistentState('battleship-fog', false);
  const [playerShots, setPlayerShots] = useState(1);
  const [aiShots, setAiShots] = useState(1);
  const [selected, setSelected] = useState([]);
  const [stats, setStats] = usePersistentState('battleship-stats', {
    wins: 0,
    losses: 0,
  });
  const [cursor, setCursor] = useState(0);
  const [colorblind, setColorblind] = usePersistentState('battleship-colorblind', false);
  const [dragHint, setDragHint] = useState(null);
  const [hoverPreview, setHoverPreview] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [activeShipId, setActiveShipId] = useState(null);
  const [selectedShipId, setSelectedShipId] = useState(null);
  const [toast, setToast] = useState(null);
  const toastTimer = useRef(null);
  const [shotEffects, setShotEffects] = useState([]);
  const shotId = useRef(0);
  const shotTimers = useRef(new Map());
  const [modal, setModal] = useState(null);
  const [battleLog, setBattleLog] = usePersistentState('battleship-progress', {
    lastResult: null,
    lastPlayed: null,
    streak: 0,
    bestStreak: 0,
    totalGames: 0,
  });

  const tryPlace = useCallback(
    (shipId, x, y, dir) => {
      const ship = ships.find((s) => s.id === shipId);
      if (!ship) return null;
      const cells = [];
      for (let k = 0; k < ship.len; k++) {
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
        for (let dx = -1; dx <= 1; dx++) {
          for (let dy = -1; dy <= 1; dy++) {
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
    for (let k = 0; k < ship.len; k++) {
      const cx = x + (ship.dir === 0 ? k : 0);
      const cy = y + (ship.dir === 1 ? k : 0);
      if (cx < 0 || cy < 0 || cx >= BOARD_SIZE || cy >= BOARD_SIZE) continue;
      cells.push(cy * BOARD_SIZE + cx);
    }
    return cells;
  }, []);

  const placeShips = useCallback((board, layout) => {
    const newBoard = board.slice();
    layout.forEach((ship) => ship.cells?.forEach((c) => (newBoard[c] = 'ship')));
    return newBoard;
  }, []);

  const countRemaining = useCallback(
    (board, layout) =>
      layout.filter((sh) => sh.cells?.some((c) => board[c] === 'ship')).length,
    [],
  );

  const clearToast = useCallback(() => {
    setToast(null);
    if (toastTimer.current) {
      clearTimeout(toastTimer.current);
      toastTimer.current = null;
    }
  }, []);

  const showAnnouncement = useCallback(
    (type, body, title) => {
      setToast({
        type,
        title:
          title ||
          (type === 'success'
            ? 'Victory Report'
            : type === 'error'
            ? 'Critical Alert'
            : type === 'warning'
            ? 'Tactical Advisory'
            : 'Command Update'),
        message: body,
      });
      setMessage(body);
      if (toastTimer.current) {
        clearTimeout(toastTimer.current);
      }
      if (typeof window !== 'undefined') {
        toastTimer.current = window.setTimeout(() => {
          setToast(null);
          toastTimer.current = null;
        }, 4500);
      }
    },
    [],
  );

  const spawnShotEffect = useCallback(
    (boardKey, idx, outcome) => {
      if (prefersReduced) return;
      const id = shotId.current++;
      setShotEffects((effects) => [...effects, { id, board: boardKey, idx, outcome }]);
      if (typeof window !== 'undefined') {
        const timeout = window.setTimeout(() => {
          setShotEffects((effects) => effects.filter((effect) => effect.id !== id));
          shotTimers.current.delete(id);
        }, 1200);
        shotTimers.current.set(id, timeout);
      }
    },
    [prefersReduced],
  );

  useEffect(
    () => () => {
      clearToast();
      shotTimers.current.forEach((timeout) => clearTimeout(timeout));
      shotTimers.current.clear();
    },
    [clearToast],
  );

  const restart = useCallback(
    (diff = difficulty, salvoMode = salvo) => {
      const layout = decorateShips(randomizePlacement(true));
      const enemyLayout = randomizePlacement(true);
      setShips(layout);
      setEnemyShips(enemyLayout);
      setPlayerBoard(placeShips(createBoard(), layout));
      setEnemyBoard(placeShips(createBoard(), enemyLayout));
      setPhase('placement');
      setMessage('Place your ships');
      setSelected([]);
      setCursor(0);
      setDragHint(null);
      setHoverPreview(null);
      setIsDragging(false);
      setActiveShipId(null);
      setSelectedShipId(null);
      setShotEffects([]);
      setModal(null);
      let aiInstance;
      if (diff === 'hard') aiInstance = new MonteCarloAI();
      else if (diff === 'medium') aiInstance = new RandomSalvoAI();
      else aiInstance = new RandomAI();
      setAi(aiInstance);
      if (typeof aiInstance.getHeatmap === 'function') {
        aiInstance.nextMove();
        setAiHeat(aiInstance.getHeatmap().slice());
      } else {
        setAiHeat(Array(BOARD_SIZE * BOARD_SIZE).fill(0));
      }
      const playerAiInstance = new MonteCarloAI();
      playerAiInstance.nextMove();
      setPlayerAi(playerAiInstance);
      setGuessHeat(playerAiInstance.getHeatmap().slice());
      const pShots = salvoMode ? layout.length : 1;
      const aShots = salvoMode ? enemyLayout.length : 1;
      setPlayerShots(pShots);
      setAiShots(aShots);
      showAnnouncement('info', 'Fresh deployment grid established.', 'Deployment Reset');
    },
    [difficulty, placeShips, salvo, showAnnouncement],
  );

  useEffect(() => {
    restart();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleDragStart = (i) => {
    setIsDragging(true);
    setActiveShipId(ships[i].id);
    setSelectedShipId(ships[i].id);
  };

  const handleDrag = (i, data) => {
    const x = Math.round(data.x / CELL);
    const y = Math.round(data.y / CELL);
    const ship = ships[i];
    const cells = tryPlace(ship.id, x, y, ship.dir);
    if (cells) setDragHint({ cells, valid: true });
    else setDragHint({ cells: getDragCells(ship, x, y), valid: false });
  };

  const handleDragStop = (i, data) => {
    const x = Math.round(data.x / CELL);
    const y = Math.round(data.y / CELL);
    const ship = ships[i];
    const cells = tryPlace(ship.id, x, y, ship.dir);
    if (cells) {
      const updated = ships.map((s) => (s.id === ship.id ? { ...s, x, y, cells } : s));
      setShips(updated);
      setPlayerBoard(placeShips(createBoard(), updated));
    }
    setDragHint(null);
    setIsDragging(false);
  };

  const rotateShip = (id) => {
    const ship = ships.find((s) => s.id === id);
    if (!ship) return;
    const newDir = ship.dir === 0 ? 1 : 0;
    const x = ship.x || 0;
    const y = ship.y || 0;
    const cells = tryPlace(id, x, y, newDir);
    if (!cells) return;
    const updated = ships.map((s) => (s.id === id ? { ...s, dir: newDir, cells } : s));
    setShips(updated);
    setPlayerBoard(placeShips(createBoard(), updated));
  };

  const randomize = () => {
    const layout = decorateShips(randomizePlacement(true));
    setShips(layout);
    setPlayerBoard(placeShips(createBoard(), layout));
    setActiveShipId(null);
    setSelectedShipId(null);
    showAnnouncement('warning', 'Fleet redeployed with a fresh random layout.', 'Randomize');
  };

  const start = () => {
    if (ships.some((s) => !s.cells)) {
      showAnnouncement('warning', 'Place every vessel before starting the mission.');
      return;
    }
    setPhase('battle');
    if (salvo) {
      setPlayerShots(countRemaining(playerBoard, ships));
      setAiShots(countRemaining(enemyBoard, enemyShips));
    }
    showAnnouncement('info', 'Deployment complete. Your turn to strike!', 'Engagement Begins');
  };

  const aiTurn = useCallback(
    (shots, playerHit) => {
      let pb = playerBoard.slice();
      let heat = aiHeat.slice();
      for (let s = 0; s < shots; s++) {
        const move = ai.nextMove();
        if (move == null) break;
        if (typeof ai.getHeatmap === 'function') {
          heat = ai.getHeatmap().slice();
        } else {
          heat[move]++;
        }
        const hit2 = pb[move] === 'ship';
        pb[move] = hit2 ? 'hit' : 'miss';
        ai.record(move, hit2);
        spawnShotEffect('player', move, hit2 ? 'hit' : 'miss');
        if (!pb.includes('ship')) {
          setPlayerBoard(pb);
          setAiHeat(heat);
          setMessage('AI wins!');
          setPhase('done');
          setStats((st) => ({ ...st, losses: st.losses + 1 }));
          setBattleLog((prev) => ({
            ...prev,
            lastResult: 'defeat',
            lastPlayed: Date.now(),
            streak: 0,
            bestStreak: prev.bestStreak,
            totalGames: prev.totalGames + 1,
          }));
          showAnnouncement('error', 'Enemy fleet prevails. Regroup and try again.', 'Defeat');
          setModal('defeat');
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
        setAiShots(countRemaining(enemyBoard, enemyShips));
        setPlayerShots(countRemaining(pb, ships));
      } else {
        setAiShots(1);
        setPlayerShots(1);
      }
      showAnnouncement(
        playerHit ? 'warning' : 'info',
        playerHit ? 'Enemy is retaliating after your strike!' : 'Enemy salvos splashed harmlessly.',
      );
    },
    [ai, aiHeat, playerBoard, salvo, enemyBoard, enemyShips, countRemaining, ships, spawnShotEffect, setBattleLog, setStats, showAnnouncement],
  );

  const toggleSelect = useCallback(
    (idx) => {
      if (phase !== 'battle' || enemyBoard[idx]) return;
      setSelected((sel) => {
        if (sel.includes(idx)) return sel.filter((s) => s !== idx);
        if (sel.length >= playerShots) return sel;
        return [...sel, idx];
      });
    },
    [phase, enemyBoard, playerShots],
  );

  const fireSelected = useCallback(() => {
    if (phase !== 'battle' || !selected.length) return;
    const hit = selected.some((i) => enemyBoard[i] === 'ship');
    selected.forEach((idx) => {
      const wasHit = enemyBoard[idx] === 'ship';
      spawnShotEffect('enemy', idx, wasHit ? 'hit' : 'miss');
    });
    const { board: newBoard } = fireShots(enemyBoard, selected);
    setEnemyBoard(newBoard);
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
      setStats((s) => ({ ...s, wins: s.wins + 1 }));
      setBattleLog((prev) => {
        const streak = prev.streak + 1;
        return {
          ...prev,
          lastResult: 'victory',
          lastPlayed: Date.now(),
          streak,
          bestStreak: Math.max(prev.bestStreak, streak),
          totalGames: prev.totalGames + 1,
        };
      });
      showAnnouncement('success', 'Enemy fleet neutralized. Excellent work!', 'Victory');
      setModal('victory');
      return;
    }
    const aiCount = salvo ? aiShots : 1;
    setTimeout(() => aiTurn(aiCount, hit), 150);
    showAnnouncement(hit ? 'success' : 'warning', hit ? 'Direct hit! Brace for counter-fire.' : 'Shots splashed – adjust targeting.');
  }, [phase, selected, enemyBoard, playerAi, setGuessHeat, salvo, aiShots, aiTurn, setEnemyBoard, spawnShotEffect, setStats, setBattleLog, showAnnouncement]);
  useGameControls(({ x, y }) => {
    if (phase !== 'battle') return;
    setCursor((c) => {
      const cx = (c % BOARD_SIZE) + x;
      const cy = Math.floor(c / BOARD_SIZE) + y;
      if (cx < 0 || cy < 0 || cx >= BOARD_SIZE || cy >= BOARD_SIZE) return c;
      return cy * BOARD_SIZE + cx;
    });
  });

  useEffect(() => {
    const handleKey = (e) => {
      if (phase !== 'battle') return;
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
  }, [phase, cursor, toggleSelect, fireSelected]);

  const effectsByBoard = useMemo(() => {
    const map = { player: new Map(), enemy: new Map() };
    shotEffects.forEach((effect) => {
      const boardKey = map[effect.board];
      if (!boardKey.has(effect.idx)) boardKey.set(effect.idx, []);
      boardKey.get(effect.idx).push(effect);
    });
    return map;
  }, [shotEffects]);

  const placementHover = useCallback(
    (event) => {
      if (phase !== 'placement' || isDragging) return;
      const shipId = activeShipId ?? selectedShipId;
      if (shipId == null) {
        setHoverPreview(null);
        return;
      }
      const ship = ships.find((s) => s.id === shipId);
      if (!ship) return;
      const rect = event.currentTarget.getBoundingClientRect();
      const offsetX = event.clientX - rect.left;
      const offsetY = event.clientY - rect.top;
      const x = Math.floor(offsetX / CELL);
      const y = Math.floor(offsetY / CELL);
      if (x < 0 || y < 0 || x >= BOARD_SIZE || y >= BOARD_SIZE) {
        setHoverPreview(null);
        return;
      }
      const cells = tryPlace(ship.id, x, y, ship.dir);
      setHoverPreview({ cells: cells || getDragCells(ship, x, y), valid: Boolean(cells) });
    },
    [phase, isDragging, activeShipId, selectedShipId, ships, tryPlace, getDragCells],
  );

  const renderBoard = (board, opts = {}) => {
    const { isEnemy = false, hideInfo = false } = opts;
    const heatArr = isEnemy ? guessHeat : aiHeat;
    const maxHeat = Math.max(...heatArr);
    const effectMap = isEnemy ? effectsByBoard.enemy : effectsByBoard.player;
    const activeHint = dragHint || (!isEnemy && hoverPreview);

    return (
      <div className="battle-card">
        <div className="board-surface relative border border-cyan-500/20 bg-gradient-to-br from-slate-950/95 via-slate-900/80 to-slate-950/95 p-4">
          <div
            className="grid relative"
            style={{
              gridTemplateColumns: `repeat(${BOARD_SIZE}, ${CELL}px)`,
              gridTemplateRows: `repeat(${BOARD_SIZE}, ${CELL}px)`,
              background: 'linear-gradient(135deg, rgba(15,118,110,0.35), rgba(14,116,144,0.25))',
            }}
            onMouseMove={!isEnemy ? placementHover : undefined}
            onMouseLeave={!isEnemy ? () => setHoverPreview(null) : undefined}
          >
            {board.map((cell, idx) => {
              const heatVal = heatArr[idx];
              const norm = maxHeat ? heatVal / maxHeat : 0;
              const color =
                showHeatmap && heatVal
                  ? isEnemy
                    ? `rgba(56,189,248,${norm * 0.6})`
                    : `rgba(251,191,36,${norm * 0.7})`
                  : 'transparent';
              const selectedMark = isEnemy && phase === 'battle' && selected.includes(idx);
              const hint = activeHint && activeHint.cells && activeHint.cells.includes(idx);
              const hintValid = hint && activeHint.valid;
              const effects = effectMap.get(idx);
              return (
                <div
                  key={idx}
                  className="relative border border-ub-dark-grey/60"
                  style={{ width: CELL, height: CELL }}
                >
                  {isEnemy && phase === 'battle' && !['hit', 'miss'].includes(cell) ? (
                    <button
                      type="button"
                      className="h-full w-full"
                      onClick={() => toggleSelect(idx)}
                      aria-label={`select target at ${Math.floor(idx / BOARD_SIZE) + 1},${(idx % BOARD_SIZE) + 1}`}
                      aria-pressed={selectedMark}
                    />
                  ) : null}
                  {cell === 'hit' && !hideInfo && <HitMarker colorblind={colorblind} />}
                  {cell === 'miss' && !hideInfo && <MissMarker colorblind={colorblind} />}
                  <div
                    className="pointer-events-none absolute inset-0"
                    style={{ background: color, zIndex: 0 }}
                    aria-hidden="true"
                  />
                  {hint && (
                    <div
                      className={`pointer-events-none absolute inset-0 ${
                        hintValid ? 'bg-emerald-400/35' : 'bg-rose-500/35'
                      }`}
                      style={{ transition: 'opacity 0.2s ease' }}
                    />
                  )}
                  {selectedMark && (
                    <div className="pointer-events-none absolute inset-0 rounded-md border-2 border-yellow-300/90 bg-yellow-200/30" />
                  )}
                  {hideInfo && phase === 'battle' && (
                    <div className="absolute inset-0 bg-slate-900" aria-hidden="true" />
                  )}
                  {isEnemy && phase === 'battle' && idx === cursor && (
                    <div className="pointer-events-none absolute inset-0 rounded-md border-2 border-cyan-300/80" />
                  )}
                  {effects?.map((effect) => (
                    <ShotEffect
                      key={effect.id}
                      outcome={effect.outcome}
                      colorblind={colorblind}
                      reduced={prefersReduced}
                    />
                  ))}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  };

  const closeModal = () => setModal(null);

  return (
    <div className="h-full w-full">
      <GameLayout
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
          restart(difficulty, v);
        }}
        fog={fog}
        onFogChange={(v) => setFog(v)}
        colorblind={colorblind}
        onColorblindChange={(v) => setColorblind(v)}
        toast={toast}
        onDismissToast={clearToast}
        ships={ships}
        onRotateShip={rotateShip}
        onSelectShip={(id) => setSelectedShipId((current) => (current === id ? null : id))}
        selectedShipId={selectedShipId}
        phase={phase}
        battleLog={battleLog}
      >
        <div className="sr-only" role="status" aria-live="polite">
          {message}
        </div>
        {phase === 'done' && (
          <button
            type="button"
            className="rounded-lg bg-cyan-600 px-3 py-2 text-sm font-semibold uppercase tracking-wide shadow-lg transition hover:bg-cyan-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-200"
            onClick={() => restart(difficulty)}
          >
            Play Again
          </button>
        )}
        {phase === 'placement' && (
          <div className="flex flex-col items-center gap-6 lg:flex-row">
            <div
              className="relative rounded-[1.5rem] border border-cyan-500/30 bg-slate-950/70 p-4 shadow-[0_20px_45px_rgba(0,0,0,0.45)]"
              style={{ width: BOARD_SIZE * CELL + 32, height: BOARD_SIZE * CELL + 32 }}
            >
              <div className="absolute left-4 top-4">
                <span className="rounded-full bg-cyan-500/30 px-3 py-1 text-xs uppercase tracking-wide text-cyan-100">
                  Deployment Grid
                </span>
              </div>
              <div className="absolute inset-4">
                {renderBoard(playerBoard)}
                {ships.map((ship, i) => (
                  <Draggable
                    key={ship.id}
                    grid={[CELL, CELL]}
                    position={{ x: (ship.x || 0) * CELL, y: (ship.y || 0) * CELL }}
                    onStart={(e, data) => {
                      handleDragStart(i);
                      handleDrag(i, data);
                    }}
                    onDrag={(e, data) => handleDrag(i, data)}
                    onStop={(e, data) => handleDragStop(i, data)}
                    disabled={phase !== 'placement'}
                    className={`ship-draggable ${selectedShipId === ship.id ? 'ship-selected' : ''}`}
                  >
                    <div
                      className="absolute h-full w-full"
                      aria-hidden="true"
                      style={{
                        width: (ship.dir === 0 ? ship.len : 1) * CELL,
                        height: (ship.dir === 1 ? ship.len : 1) * CELL,
                        background:
                          'linear-gradient(135deg, rgba(14,165,233,0.85), rgba(29,78,216,0.7))',
                        borderRadius: '12px',
                        boxShadow: '0 20px 35px rgba(14,165,233,0.35)',
                        transition: 'transform 0.25s ease, box-shadow 0.25s ease',
                        outline: selectedShipId === ship.id ? '2px solid rgba(165,243,252,0.9)' : 'none',
                      }}
                      onDoubleClick={() => rotateShip(ship.id)}
                    />
                  </Draggable>
                ))}
              </div>
            </div>
            <div className="flex w-full max-w-xs flex-col gap-3 rounded-2xl border border-cyan-400/20 bg-slate-950/60 p-4 shadow-[0_20px_45px_rgba(0,0,0,0.45)]">
              <button
                type="button"
                className="w-full rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 px-4 py-2 text-sm font-semibold uppercase tracking-wide shadow-lg transition hover:from-cyan-400 hover:to-blue-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-200"
                onClick={randomize}
              >
                Randomize Fleet
              </button>
              <button
                type="button"
                className="w-full rounded-xl border border-cyan-300/40 bg-slate-900/80 px-4 py-2 text-sm font-semibold uppercase tracking-wide text-cyan-200 transition hover:bg-slate-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300"
                onClick={start}
              >
                Begin Battle
              </button>
              <p className="text-xs text-white/60">
                Tip: Select a ship from the inventory to preview placements, drag to reposition, and double-click to rotate.
              </p>
            </div>
          </div>
        )}
        {phase !== 'placement' && (
          <div className="flex flex-col items-center gap-6">
            <div className="flex flex-col gap-6 lg:flex-row">
              <div className="rounded-[1.5rem] border border-cyan-500/30 bg-slate-950/70 p-4 shadow-[0_20px_45px_rgba(0,0,0,0.45)]">
                <div className="mb-3 text-xs uppercase tracking-wide text-cyan-200/80">Your Fleet</div>
                {renderBoard(playerBoard, { hideInfo: fog && phase === 'battle' })}
              </div>
              <div className="rounded-[1.5rem] border border-cyan-500/30 bg-slate-950/70 p-4 shadow-[0_20px_45px_rgba(0,0,0,0.45)]">
                <div className="mb-3 text-xs uppercase tracking-wide text-cyan-200/80">Enemy Waters</div>
                {renderBoard(enemyBoard, { isEnemy: true })}
              </div>
            </div>
            {phase === 'battle' && (
              <div className="flex flex-col items-center gap-2">
                <div className="text-sm text-white/80">
                  Selected {selected.length}/{playerShots}
                </div>
                <button
                  type="button"
                  className="rounded-xl bg-gradient-to-br from-rose-500 to-orange-500 px-4 py-2 text-sm font-semibold uppercase tracking-wide text-white shadow-lg transition hover:from-rose-400 hover:to-orange-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-200 disabled:cursor-not-allowed disabled:opacity-60"
                  onClick={fireSelected}
                  disabled={!selected.length}
                >
                  Fire Salvo
                </button>
              </div>
            )}
          </div>
        )}
      </GameLayout>
      {modal ? (
        <ResultModal
          type={modal}
          onClose={closeModal}
          onRestart={() => restart(difficulty)}
          stats={stats}
          reduced={prefersReduced}
        />
      ) : null}
      <style jsx global>{`
        .ship-draggable {
          transition: transform 0.25s cubic-bezier(0.22, 0.61, 0.36, 1);
          will-change: transform;
        }
        .ship-draggable.ship-selected {
          z-index: 10;
        }
        .ship-draggable:active {
          cursor: grabbing;
        }
        .shot-trail {
          position: absolute;
          width: 6px;
          height: 120%;
          background: linear-gradient(to bottom, rgba(255,255,255,0.9), rgba(59,130,246,0));
          border-radius: 9999px;
          animation: shotTrail 0.35s ease forwards;
        }
        .shot-impact {
          position: absolute;
          width: 48px;
          height: 48px;
          border-radius: 9999px;
          opacity: 0;
          transform: scale(0.4);
        }
        .shot-impact-hit {
          background: radial-gradient(circle, rgba(248,113,113,0.95), rgba(127,29,29,0.1));
          animation: shotImpactHit 0.6s ease forwards;
        }
        .shot-impact-miss {
          background: radial-gradient(circle, rgba(96,165,250,0.9), rgba(2,132,199,0.1));
          animation: shotImpactMiss 0.6s ease forwards;
        }
        .shot-particles {
          position: absolute;
          inset: 0;
          display: block;
        }
        .shot-particles .particle {
          position: absolute;
          width: 6px;
          height: 6px;
          border-radius: 50%;
          opacity: 0;
          animation: particleBurst 0.7s ease forwards;
        }
        .shot-particles .particle-0 { top: 50%; left: 50%; }
        .shot-particles .particle-1 { top: 35%; left: 60%; }
        .shot-particles .particle-2 { top: 65%; left: 40%; }
        .shot-particles .particle-3 { top: 30%; left: 40%; }
        .shot-particles .particle-4 { top: 70%; left: 60%; }
        .shot-particles .particle-5 { top: 50%; left: 30%; }
        .confetti-field {
          pointer-events: none;
          position: absolute;
          inset: 0;
        }
        .confetti-piece {
          position: absolute;
          top: -20px;
          left: var(--offset);
          width: 6px;
          height: 16px;
          border-radius: 2px;
          animation: confettiFall var(--duration) linear var(--delay) infinite;
        }
        @keyframes shotTrail {
          0% { transform: translateY(-120%) scaleY(0.3); opacity: 0.8; }
          100% { transform: translateY(0) scaleY(1); opacity: 0; }
        }
        @keyframes shotImpactHit {
          0% { transform: scale(0.4); opacity: 0; }
          40% { transform: scale(1); opacity: 1; }
          100% { transform: scale(1.2); opacity: 0; }
        }
        @keyframes shotImpactMiss {
          0% { transform: scale(0.3); opacity: 0; }
          60% { transform: scale(0.9); opacity: 0.8; }
          100% { transform: scale(1); opacity: 0; }
        }
        @keyframes particleBurst {
          0% { transform: translate3d(0,0,0) scale(0.5); opacity: 1; }
          100% { transform: translate3d(var(--dx, 12px), var(--dy, -18px), 0) scale(0.1); opacity: 0; }
        }
        .shot-particles .particle-0 { --dx: 12px; --dy: -20px; }
        .shot-particles .particle-1 { --dx: -10px; --dy: -14px; }
        .shot-particles .particle-2 { --dx: 14px; --dy: -4px; }
        .shot-particles .particle-3 { --dx: -14px; --dy: -6px; }
        .shot-particles .particle-4 { --dx: 8px; --dy: -18px; }
        .shot-particles .particle-5 { --dx: -6px; --dy: -16px; }
        @keyframes confettiFall {
          0% { transform: translate3d(0, -10px, 0) rotate(0deg); opacity: 1; }
          100% { transform: translate3d(0, 160px, 0) rotate(540deg); opacity: 0; }
        }
      `}</style>
    </div>
  );
};

export default Battleship;
