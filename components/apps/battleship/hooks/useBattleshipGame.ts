import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  BOARD_SIZE,
  MonteCarloAI,
  RandomAI,
  RandomSalvoAI,
  randomizePlacement,
} from '../../../../apps/games/battleship/ai';
import { fireShots } from '../../../../apps/games/battleship/logic';
import {
  cellsForShip,
  getRing,
  isShipSunk,
  Placement,
  validatePlacement,
} from '../../../../apps/games/battleship/rules';
import { createRng } from '../../../../apps/games/battleship/rng';
import usePersistentState from '../../../../hooks/usePersistentState';
import { useBattleAnnouncements } from './useBattleAnnouncements';

export type BattleMode = 'ai' | 'hotseat';

type Direction = 0 | 1;

type ShipLayout = Placement & {
  id: number;
  name: string;
};

type PlayerState = {
  board: Array<'ship' | 'hit' | 'miss' | null>;
  ships: ShipLayout[];
  sunkIds: Set<number>;
  lastShots: number[];
};

const SHIP_DEFS = [
  { id: 0, name: 'Carrier', len: 5 },
  { id: 1, name: 'Battleship', len: 4 },
  { id: 2, name: 'Cruiser', len: 3 },
  { id: 3, name: 'Submarine', len: 3 },
  { id: 4, name: 'Destroyer', len: 2 },
];

const createBoard = () => Array(BOARD_SIZE * BOARD_SIZE).fill(null);

const decorateShips = (layout: Placement[]) => {
  const pool = SHIP_DEFS.slice();
  return layout.map((ship) => {
    const matchIndex = pool.findIndex((item) => item.len === ship.len);
    const match = matchIndex >= 0 ? pool.splice(matchIndex, 1)[0] : pool.shift();
    return {
      ...ship,
      id: match?.id ?? ship.id ?? Math.random(),
      name: match?.name ?? `Ship ${ship.len}`,
    } as ShipLayout;
  });
};

const createPlayerState = (layout: ShipLayout[]) => {
  const ships = layout;
  return {
    board: ships.length ? ships.reduce((board, ship) => {
      ship.cells?.forEach((idx) => {
        board[idx] = 'ship';
      });
      return board;
    }, createBoard()) : createBoard(),
    ships,
    sunkIds: new Set<number>(),
    lastShots: [],
  } as PlayerState;
};

const readHeatmap = (ai: unknown) => {
  if (typeof (ai as { getHeatmap?: () => number[] })?.getHeatmap === 'function') {
    return (ai as { getHeatmap: () => number[] }).getHeatmap();
  }
  return null;
};

const countRemaining = (board: PlayerState['board'], layout: ShipLayout[]) =>
  layout.filter((ship) => ship.cells && !isShipSunk(board, ship.cells)).length;

const markBlockedCells = (board: PlayerState['board'], cells: number[]) => {
  const updated = board.slice();
  cells.forEach((idx) => {
    if (idx < 0 || idx >= updated.length) return;
    if (updated[idx] == null) updated[idx] = 'miss';
  });
  return updated;
};

const getDragCells = (ship: ShipLayout, x: number, y: number) => {
  const cells = [] as number[];
  for (let k = 0; k < ship.len; k++) {
    const cx = x + (ship.dir === 0 ? k : 0);
    const cy = y + (ship.dir === 1 ? k : 0);
    if (cx < 0 || cy < 0 || cx >= BOARD_SIZE || cy >= BOARD_SIZE) continue;
    cells.push(cy * BOARD_SIZE + cx);
  }
  return cells;
};

const computeShotLimit = (salvoMode: boolean, player: PlayerState) =>
  salvoMode ? countRemaining(player.board, player.ships) : 1;

const getDefaultStats = () => ({
  wins: 0,
  losses: 0,
  shotsFired: 0,
  shotsHit: 0,
  totalGames: 0,
  totalTurns: 0,
  currentStreak: 0,
  bestStreak: 0,
  player1Wins: 0,
  player2Wins: 0,
});

export const useBattleshipGame = () => {
  const [difficulty, setDifficulty] = usePersistentState('battleship-difficulty', 'easy');
  const [noTouch, setNoTouch] = usePersistentState('battleship-no-touch', true);
  const [salvo, setSalvo] = usePersistentState('battleship-salvo', false);
  const [fog, setFog] = usePersistentState('battleship-fog', false);
  const [colorblind, setColorblind] = usePersistentState('battleship-colorblind', false);
  const [showGuessHeat, setShowGuessHeat] = usePersistentState('battleship-heat-guess', true);
  const [showAiHeat, setShowAiHeat] = usePersistentState('battleship-heat-ai', false);
  const [mode, setMode] = usePersistentState('battleship-mode', 'ai');
  const [stats, setStats] = usePersistentState('battleship-stats', getDefaultStats());
  const [battleLog, setBattleLog] = usePersistentState<{
    lastResult: string | null;
    lastPlayed: number | null;
  }>('battleship-progress', {
    lastResult: null,
    lastPlayed: null,
  });

  const { toast, message, announce, dismiss } = useBattleAnnouncements();

  const [phase, setPhase] = useState<'placement' | 'battle' | 'done'>('placement');
  const [players, setPlayers] = useState<[PlayerState, PlayerState]>(() => {
    const layout = decorateShips(randomizePlacement(true, { maxAttempts: 50 }));
    return [createPlayerState(layout), createPlayerState(layout)];
  });
  const [activePlayer, setActivePlayer] = useState(0);
  const [placementPlayer, setPlacementPlayer] = useState(0);
  const [passScreen, setPassScreen] = useState(false);
  const [selectedTargets, setSelectedTargets] = useState<number[]>([]);
  const [cursor, setCursor] = useState(0);
  const [placementCursor, setPlacementCursor] = useState(0);
  const [dragHint, setDragHint] = useState<{ cells: number[]; valid: boolean } | null>(null);
  const [hoverPreview, setHoverPreview] = useState<{ cells: number[]; valid: boolean } | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [activeShipId, setActiveShipId] = useState<number | null>(null);
  const [selectedShipId, setSelectedShipId] = useState<number | null>(null);
  const [modal, setModal] = useState<'victory' | 'defeat' | null>(null);
  const [shotEffects, setShotEffects] = useState<{ id: number; board: 'player' | 'enemy'; idx: number; outcome: 'hit' | 'miss' }[]>([]);
  const [guessHeat, setGuessHeat] = useState(Array(BOARD_SIZE * BOARD_SIZE).fill(0));
  const [aiHeat, setAiHeat] = useState(Array(BOARD_SIZE * BOARD_SIZE).fill(0));
  const [turnCount, setTurnCount] = useState(0);

  const aiRef = useRef<MonteCarloAI | RandomAI | RandomSalvoAI | null>(null);
  const playerAiRef = useRef<MonteCarloAI | null>(null);
  const shotIdRef = useRef(0);
  const shotTimers = useRef(new Map<number, number>());
  const aiTurnTimer = useRef<number | null>(null);

  const enemyShipSet = useMemo(() => {
    const enemy = players[activePlayer === 0 ? 1 : 0];
    return new Set(enemy.ships.flatMap((ship) => ship.cells || []));
  }, [players, activePlayer]);

  const sunkEnemyCells = useMemo(() => {
    const enemy = players[activePlayer === 0 ? 1 : 0];
    return new Set(
      enemy.ships
        .filter((ship) => enemy.sunkIds.has(ship.id))
        .flatMap((ship) => ship.cells || []),
    );
  }, [players, activePlayer]);

  const sunkPlayerCells = useMemo(() => {
    const player = players[activePlayer];
    return new Set(
      player.ships
        .filter((ship) => player.sunkIds.has(ship.id))
        .flatMap((ship) => ship.cells || []),
    );
  }, [players, activePlayer]);

  const placementPlayerState = players[placementPlayer];
  const activePlayerState = players[activePlayer];
  const opponentState = players[activePlayer === 0 ? 1 : 0];

  const tryPlace = useCallback(
    (shipId: number, x: number, y: number, dir: Direction) => {
      const ship = placementPlayerState.ships.find((s) => s.id === shipId);
      if (!ship) return null;
      const cells = cellsForShip(x, y, dir, ship.len, BOARD_SIZE);
      if (!cells) return null;
      const candidateLayout = placementPlayerState.ships.map((s) =>
        s.id === shipId ? { ...s, x, y, dir, cells } : s,
      );
      const validation = validatePlacement(candidateLayout, {
        size: BOARD_SIZE,
        noTouch,
      });
      return validation.ok ? cells : null;
    },
    [placementPlayerState.ships, noTouch],
  );

  const updatePlayerState = useCallback((index: number, updater: (prev: PlayerState) => PlayerState) => {
    setPlayers((prev) => {
      const updated = [...prev] as [PlayerState, PlayerState];
      updated[index] = updater(prev[index]);
      return updated;
    });
  }, []);

  const applyPlacement = useCallback(
    (shipId: number, x: number, y: number, dir: Direction) => {
      const cells = tryPlace(shipId, x, y, dir);
      if (!cells) return null;
      updatePlayerState(placementPlayer, (prev) => {
        const updatedShips = prev.ships.map((s) =>
          s.id === shipId ? { ...s, x, y, dir, cells } : s,
        );
        const board = createBoard();
        updatedShips.forEach((ship) => ship.cells?.forEach((idx) => {
          board[idx] = 'ship';
        }));
        return {
          ...prev,
          ships: updatedShips,
          board,
        };
      });
      return cells;
    },
    [placementPlayer, tryPlace, updatePlayerState],
  );

  const rotateShip = useCallback(
    (id: number) => {
      const ship = placementPlayerState.ships.find((s) => s.id === id);
      if (!ship) return;
      const newDir: Direction = ship.dir === 0 ? 1 : 0;
      const x = ship.x;
      const y = ship.y;
      const cells = tryPlace(id, x, y, newDir);
      if (!cells) return;
      updatePlayerState(placementPlayer, (prev) => {
        const updatedShips = prev.ships.map((s) =>
          s.id === id ? { ...s, dir: newDir, cells } : s,
        );
        const board = createBoard();
        updatedShips.forEach((ship) => ship.cells?.forEach((idx) => {
          board[idx] = 'ship';
        }));
        return {
          ...prev,
          ships: updatedShips,
          board,
        };
      });
    },
    [placementPlayerState.ships, placementPlayer, tryPlace, updatePlayerState],
  );

  const randomize = useCallback(() => {
    updatePlayerState(placementPlayer, () => {
      const layout = decorateShips(randomizePlacement(noTouch, { maxAttempts: 50 }));
      const board = createBoard();
      layout.forEach((ship) => ship.cells?.forEach((idx) => {
        board[idx] = 'ship';
      }));
      return {
        board,
        ships: layout,
        sunkIds: new Set(),
        lastShots: [],
      };
    });
    setActiveShipId(null);
    setSelectedShipId(null);
    announce('warning', 'Fleet redeployed with a fresh random layout.', 'Randomize');
  }, [announce, noTouch, placementPlayer, updatePlayerState]);

  const spawnShotEffect = useCallback((boardKey: 'player' | 'enemy', idx: number, outcome: 'hit' | 'miss') => {
    const id = shotIdRef.current++;
    setShotEffects((effects) => [...effects, { id, board: boardKey, idx, outcome }]);
    if (typeof window !== 'undefined') {
      const timeout = window.setTimeout(() => {
        setShotEffects((effects) => effects.filter((effect) => effect.id !== id));
        shotTimers.current.delete(id);
      }, 1200);
      shotTimers.current.set(id, timeout);
    }
  }, []);

  const resetStats = useCallback(() => {
    setStats(getDefaultStats());
  }, [setStats]);

  const restart = useCallback(
    (options?: { diff?: string; salvoMode?: boolean; modeOverride?: BattleMode }) => {
      const diff = options?.diff ?? difficulty;
      const salvoMode = options?.salvoMode ?? salvo;
      const modeValue = options?.modeOverride ?? (mode as BattleMode);
      const seed = Date.now();
      const playerLayout = decorateShips(randomizePlacement(noTouch, { maxAttempts: 50, seed }));
      const opponentLayout = decorateShips(
        randomizePlacement(noTouch, {
          maxAttempts: 50,
          seed: seed + 1,
        }),
      );

      setPhase('placement');
      setPlacementPlayer(0);
      setActivePlayer(0);
      setPassScreen(false);
      setSelectedTargets([]);
      setCursor(0);
      setPlacementCursor(0);
      setDragHint(null);
      setHoverPreview(null);
      setIsDragging(false);
      setActiveShipId(null);
      setSelectedShipId(null);
      setModal(null);
      setShotEffects([]);
      setTurnCount(0);

      const playerBoard = createBoard();
      playerLayout.forEach((ship) => ship.cells?.forEach((idx) => {
        playerBoard[idx] = 'ship';
      }));
      const opponentBoard = createBoard();
      if (modeValue === 'hotseat') {
        opponentLayout.forEach((ship) => ship.cells?.forEach((idx) => {
          opponentBoard[idx] = 'ship';
        }));
      }
      setPlayers([
        {
          board: playerBoard,
          ships: playerLayout,
          sunkIds: new Set(),
          lastShots: [],
        },
        {
          board: opponentBoard,
          ships: opponentLayout,
          sunkIds: new Set(),
          lastShots: [],
        },
      ]);

      if (modeValue === 'ai') {
        let aiInstance;
        if (diff === 'hard') aiInstance = new MonteCarloAI({ noAdjacency: noTouch, rng: createRng(seed + 2) });
        else if (diff === 'medium') aiInstance = new RandomSalvoAI({ rng: createRng(seed + 2) });
        else aiInstance = new RandomAI({ rng: createRng(seed + 2) });
        aiRef.current = aiInstance;
        const initialHeatmap = readHeatmap(aiInstance);
        if (initialHeatmap) {
          aiInstance.nextMove();
          setAiHeat(readHeatmap(aiInstance)?.slice() ?? Array(BOARD_SIZE * BOARD_SIZE).fill(0));
        } else {
          setAiHeat(Array(BOARD_SIZE * BOARD_SIZE).fill(0));
        }
        const playerAiInstance = new MonteCarloAI({ noAdjacency: noTouch, rng: createRng(seed + 3) });
        playerAiInstance.nextMove();
        playerAiRef.current = playerAiInstance;
        setGuessHeat(playerAiInstance.getHeatmap().slice());
      } else {
        aiRef.current = null;
        playerAiRef.current = null;
        setAiHeat(Array(BOARD_SIZE * BOARD_SIZE).fill(0));
        setGuessHeat(Array(BOARD_SIZE * BOARD_SIZE).fill(0));
      }

      announce('info', 'Fresh deployment grid established.', 'Deployment Reset');
      setDifficulty(diff);
      setSalvo(salvoMode);
      setMode(modeValue);
    },
    [announce, difficulty, mode, noTouch, salvo, setDifficulty, setMode, setSalvo],
  );

  useEffect(() => {
    restart();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(
    () => () => {
      shotTimers.current.forEach((timeout) => window.clearTimeout(timeout));
      shotTimers.current.clear();
      if (aiTurnTimer.current) {
        window.clearTimeout(aiTurnTimer.current);
        aiTurnTimer.current = null;
      }
    },
    [],
  );

  const handleDragStart = useCallback((shipId: number) => {
    setIsDragging(true);
    setActiveShipId(shipId);
    setSelectedShipId(shipId);
  }, []);

  const handleDrag = useCallback(
    (shipId: number, x: number, y: number) => {
      const ship = placementPlayerState.ships.find((s) => s.id === shipId);
      if (!ship) return;
      const cells = tryPlace(shipId, x, y, ship.dir);
      if (cells) setDragHint({ cells, valid: true });
      else setDragHint({ cells: getDragCells(ship, x, y), valid: false });
    },
    [placementPlayerState.ships, tryPlace],
  );

  const handleDragStop = useCallback(
    (shipId: number, x: number, y: number) => {
      const ship = placementPlayerState.ships.find((s) => s.id === shipId);
      if (!ship) return;
      const cells = tryPlace(shipId, x, y, ship.dir);
      if (cells) {
        applyPlacement(shipId, x, y, ship.dir);
      }
      setDragHint(null);
      setIsDragging(false);
    },
    [placementPlayerState.ships, tryPlace, applyPlacement],
  );

  const placementHover = useCallback(
    (x: number, y: number) => {
      if (phase !== 'placement' || isDragging) return;
      const shipId = activeShipId ?? selectedShipId;
      if (shipId == null) {
        setHoverPreview(null);
        return;
      }
      const ship = placementPlayerState.ships.find((s) => s.id === shipId);
      if (!ship) return;
      const cells = tryPlace(shipId, x, y, ship.dir);
      setHoverPreview({ cells: cells || getDragCells(ship, x, y), valid: Boolean(cells) });
    },
    [phase, isDragging, activeShipId, selectedShipId, placementPlayerState.ships, tryPlace],
  );

  const placeSelectedShip = useCallback(
    (x: number, y: number) => {
      if (phase !== 'placement') return;
      const shipId = activeShipId ?? selectedShipId;
      if (shipId == null) {
        announce('warning', 'Select a ship before placing.');
        return;
      }
      const ship = placementPlayerState.ships.find((s) => s.id === shipId);
      if (!ship) return;
      const cells = applyPlacement(shipId, x, y, ship.dir);
      if (!cells) {
        announce('warning', 'That placement is invalid.');
      }
    },
    [phase, activeShipId, selectedShipId, placementPlayerState.ships, applyPlacement, announce],
  );

  const startBattle = useCallback(() => {
    const current = players[placementPlayer];
    if (current.ships.some((s) => !s.cells)) {
      announce('warning', 'Place every vessel before starting the mission.');
      return;
    }

    if (mode === 'hotseat' && placementPlayer === 0) {
      setPlacementPlayer(1);
      setSelectedShipId(null);
      setActiveShipId(null);
      setPassScreen(true);
      announce('info', 'Player 2: Deploy your fleet.', 'Switch Players');
      return;
    }

    if (mode === 'hotseat') {
      setPhase('battle');
      setActivePlayer(0);
      setPassScreen(true);
      setSelectedTargets([]);
      setTurnCount(0);
      announce('info', 'Player 1, prepare to strike.', 'Engagement Begins');
      return;
    }

    setPhase('battle');
    setSelectedTargets([]);
    setTurnCount(0);
    announce('info', 'Deployment complete. Your turn to strike!', 'Engagement Begins');
  }, [announce, mode, placementPlayer, players]);

  const toggleTarget = useCallback(
    (idx: number, maxShots: number) => {
      if (phase !== 'battle') return;
      const enemyBoard = opponentState.board;
      if (enemyBoard[idx]) return;
      setSelectedTargets((sel) => {
        if (sel.includes(idx)) return sel.filter((s) => s !== idx);
        if (sel.length >= maxShots) return sel;
        return [...sel, idx];
      });
    },
    [phase, opponentState.board],
  );

  const resolveSunkShips = useCallback(
    (playerIndex: number, board: PlayerState['board']) => {
      const player = players[playerIndex];
      const newlySunk = player.ships.filter(
        (ship) => ship.cells && isShipSunk(board, ship.cells) && !player.sunkIds.has(ship.id),
      );
      if (!newlySunk.length) return { board, sunkIds: player.sunkIds };
      const updatedSunk = new Set([...player.sunkIds, ...newlySunk.map((ship) => ship.id)]);
      let updatedBoard = board;
      if (noTouch) {
        const ring = Array.from(new Set(newlySunk.flatMap((ship) => getRing(ship.cells || [], BOARD_SIZE))));
        updatedBoard = markBlockedCells(updatedBoard, ring);
        if (mode === 'ai') {
          if (playerIndex === 0) aiRef.current?.markBlocked?.(ring);
          if (playerIndex === 1) playerAiRef.current?.markBlocked?.(ring);
        }
      }
      updatePlayerState(playerIndex, (prev) => ({ ...prev, sunkIds: updatedSunk }));
      return { board: updatedBoard, sunkIds: updatedSunk };
    },
    [players, noTouch, mode, updatePlayerState],
  );

  const finalizeVictory = useCallback(
    (winnerIndex: number) => {
      const isPlayerOne = winnerIndex === 0;
      const opponentIndex = winnerIndex === 0 ? 1 : 0;
      const winnerLabel = mode === 'hotseat' ? `Player ${winnerIndex + 1}` : 'Commander';
      setPhase('done');
      setModal(isPlayerOne ? 'victory' : mode === 'hotseat' ? 'victory' : 'defeat');

      setStats((prev: typeof stats) => {
        const totalGames = prev.totalGames + 1;
        const totalTurns = prev.totalTurns + turnCount;
        const newStats = {
          ...prev,
          totalGames,
          totalTurns,
          shotsFired: prev.shotsFired,
          shotsHit: prev.shotsHit,
          wins: prev.wins + (mode === 'ai' && isPlayerOne ? 1 : 0),
          losses: prev.losses + (mode === 'ai' && !isPlayerOne ? 1 : 0),
          currentStreak: mode === 'ai'
            ? isPlayerOne
              ? prev.currentStreak + 1
              : 0
            : prev.currentStreak,
          bestStreak: mode === 'ai'
            ? Math.max(prev.bestStreak, isPlayerOne ? prev.currentStreak + 1 : 0)
            : prev.bestStreak,
          player1Wins: prev.player1Wins + (mode === 'hotseat' && winnerIndex === 0 ? 1 : 0),
          player2Wins: prev.player2Wins + (mode === 'hotseat' && winnerIndex === 1 ? 1 : 0),
        };
        return newStats;
      });

      updatePlayerState(opponentIndex, (prev) => ({ ...prev }));
      setBattleLog({
        lastResult: mode === 'hotseat' ? winnerLabel : isPlayerOne ? 'victory' : 'defeat',
        lastPlayed: Date.now(),
      });
      announce(
        isPlayerOne ? 'success' : 'error',
        `${winnerLabel} secures the win.`,
        isPlayerOne ? 'Victory' : 'Defeat',
      );
    },
    [announce, mode, setBattleLog, setStats, turnCount, updatePlayerState],
  );

  const handleHotseatTurnEnd = useCallback(() => {
    setActivePlayer((prev) => (prev === 0 ? 1 : 0));
    setSelectedTargets([]);
    setPassScreen(true);
  }, []);

  const aiTurn = useCallback(
    (shots: number, playerHit: boolean) => {
      const playerIndex = 0;
      let playerBoard = players[playerIndex].board.slice();
      let heat = aiHeat.slice();
      const moves: number[] = [];
      for (let s = 0; s < shots; s++) {
        const move = aiRef.current?.nextMove();
        if (move == null) break;
        moves.push(move);
        const currentHeat = readHeatmap(aiRef.current);
        if (currentHeat) {
          heat = currentHeat.slice();
        } else {
          heat[move] += 1;
        }
        const hit = playerBoard[move] === 'ship';
        playerBoard[move] = hit ? 'hit' : 'miss';
        aiRef.current?.record(move, hit);
        spawnShotEffect('player', move, hit ? 'hit' : 'miss');
      }

      const { board: updatedBoard } = resolveSunkShips(playerIndex, playerBoard);

      updatePlayerState(playerIndex, (prev) => ({
        ...prev,
        board: updatedBoard,
        lastShots: moves,
      }));

      const defeat = players[playerIndex].ships.every(
        (ship) => ship.cells && isShipSunk(updatedBoard, ship.cells),
      );

      if (defeat) {
        finalizeVictory(1);
        return;
      }

      if (readHeatmap(aiRef.current)) {
        aiRef.current?.nextMove();
        heat = readHeatmap(aiRef.current)?.slice() ?? heat;
      }

      setAiHeat(heat);
      announce(
        playerHit ? 'warning' : 'info',
        playerHit ? 'Enemy is retaliating after your strike!' : 'Enemy salvos splashed harmlessly.',
      );
    },
    [aiHeat, announce, finalizeVictory, players, resolveSunkShips, spawnShotEffect, updatePlayerState],
  );

  const fireSelected = useCallback(() => {
    if (phase !== 'battle' || !selectedTargets.length) return;
    const maxShots = computeShotLimit(salvo, activePlayerState);
    const targets = selectedTargets.slice(0, maxShots);
    const hitsOnTruth = new Set(targets.filter((idx) => enemyShipSet.has(idx)));

    targets.forEach((idx) => {
      const wasHit = hitsOnTruth.has(idx);
      spawnShotEffect('enemy', idx, wasHit ? 'hit' : 'miss');
    });

    const { board: firedBoard, hits } = fireShots(opponentState.board, targets, enemyShipSet);
    const { board: updatedBoard } = resolveSunkShips(activePlayer === 0 ? 1 : 0, firedBoard);

    updatePlayerState(activePlayer === 0 ? 1 : 0, (prev) => ({
      ...prev,
      board: updatedBoard,
      lastShots: targets,
    }));

    setSelectedTargets([]);
    setStats((prev: typeof stats) => ({
      ...prev,
      shotsFired: prev.shotsFired + targets.length,
      shotsHit: prev.shotsHit + hits.length,
    }));

    if (mode === 'ai' && playerAiRef.current) {
      targets.forEach((idx) => {
        playerAiRef.current?.record(idx, hitsOnTruth.has(idx));
      });
      playerAiRef.current.nextMove();
      setGuessHeat(playerAiRef.current.getHeatmap().slice());
    }

    const opponentDefeated = opponentState.ships.every(
      (ship) => ship.cells && isShipSunk(updatedBoard, ship.cells),
    );

    if (opponentDefeated) {
      finalizeVictory(activePlayer);
      return;
    }

    setTurnCount((prev) => prev + 1);

    if (mode === 'hotseat') {
      handleHotseatTurnEnd();
      announce('info', 'Pass the device to the next player.', 'Turn Complete');
      return;
    }

    const aiCount = computeShotLimit(salvo, opponentState);
    if (aiTurnTimer.current) window.clearTimeout(aiTurnTimer.current);
    aiTurnTimer.current = window.setTimeout(() => aiTurn(aiCount, hits.length > 0), 150);
    announce(
      hits.length ? 'success' : 'warning',
      hits.length ? 'Direct hit! Brace for counter-fire.' : 'Shots splashed – adjust targeting.',
    );
  }, [activePlayer, activePlayerState, aiTurn, announce, enemyShipSet, finalizeVictory, handleHotseatTurnEnd, mode, opponentState, phase, resolveSunkShips, salvo, selectedTargets, setStats, spawnShotEffect, updatePlayerState]);

  const handlePassScreenReady = useCallback(() => {
    setPassScreen(false);
    setSelectedTargets([]);
    setCursor(0);
    if (phase === 'battle') {
      announce('info', `Player ${activePlayer + 1}, take your turn.`);
    }
  }, [activePlayer, announce, phase]);

  const placeCursorMove = useCallback(
    (x: number, y: number) => {
      if (phase !== 'placement') return;
      setPlacementCursor((c) => {
        const cx = (c % BOARD_SIZE) + x;
        const cy = Math.floor(c / BOARD_SIZE) + y;
        if (cx < 0 || cy < 0 || cx >= BOARD_SIZE || cy >= BOARD_SIZE) return c;
        return cy * BOARD_SIZE + cx;
      });
    },
    [phase],
  );

  const battleCursorMove = useCallback(
    (x: number, y: number) => {
      if (phase !== 'battle') return;
      setCursor((c) => {
        const cx = (c % BOARD_SIZE) + x;
        const cy = Math.floor(c / BOARD_SIZE) + y;
        if (cx < 0 || cy < 0 || cx >= BOARD_SIZE || cy >= BOARD_SIZE) return c;
        return cy * BOARD_SIZE + cx;
      });
    },
    [phase],
  );

  const placeAtCursor = useCallback(() => {
    if (phase !== 'placement') return;
    const x = placementCursor % BOARD_SIZE;
    const y = Math.floor(placementCursor / BOARD_SIZE);
    placeSelectedShip(x, y);
  }, [phase, placementCursor, placeSelectedShip]);

  const selectTargetAtCursor = useCallback(
    (maxShots: number) => {
      if (phase !== 'battle') return;
      toggleTarget(cursor, maxShots);
    },
    [cursor, phase, toggleTarget],
  );

  const rotateSelectedShip = useCallback(() => {
    const shipId = activeShipId ?? selectedShipId;
    if (shipId == null) return;
    rotateShip(shipId);
  }, [activeShipId, rotateShip, selectedShipId]);

  const activeShotLimit = useMemo(
    () => computeShotLimit(salvo, activePlayerState),
    [salvo, activePlayerState],
  );

  const placementShipsReady = useMemo(
    () => placementPlayerState.ships.every((ship) => ship.cells && ship.cells.length === ship.len),
    [placementPlayerState.ships],
  );

  const helpStats = useMemo(() => {
    const hitRate = stats.shotsFired ? Math.round((stats.shotsHit / stats.shotsFired) * 100) : 0;
    const avgTurns = stats.totalGames ? Math.round(stats.totalTurns / stats.totalGames) : 0;
    return {
      hitRate,
      avgTurns,
    };
  }, [stats]);

  return {
    settings: {
      difficulty,
      noTouch,
      salvo,
      fog,
      colorblind,
      showGuessHeat,
      showAiHeat,
      mode,
    },
    setDifficulty,
    setNoTouch,
    setSalvo,
    setFog,
    setColorblind,
    setShowGuessHeat,
    setShowAiHeat,
    setMode,
    stats,
    setStats,
    resetStats,
    battleLog,
    toast,
    message,
    dismissToast: dismiss,
    announce,
    phase,
    players,
    activePlayer,
    placementPlayer,
    passScreen,
    selectedTargets,
    cursor,
    placementCursor,
    dragHint,
    hoverPreview,
    isDragging,
    activeShipId,
    selectedShipId,
    modal,
    shotEffects,
    guessHeat,
    aiHeat,
    sunkEnemyCells,
    sunkPlayerCells,
    enemyShipSet,
    activePlayerState,
    opponentState,
    activeShotLimit,
    placementShipsReady,
    helpStats,
    setSelectedShipId,
    setActiveShipId,
    setDragHint,
    setHoverPreview,
    setIsDragging,
    setModal,
    setSelectedTargets,
    setCursor,
    restart,
    startBattle,
    rotateShip,
    rotateSelectedShip,
    randomize,
    handleDragStart,
    handleDrag,
    handleDragStop,
    placementHover,
    placeSelectedShip,
    toggleTarget,
    fireSelected,
    handlePassScreenReady,
    placeCursorMove,
    battleCursorMove,
    placeAtCursor,
    selectTargetAtCursor,
  };
};
