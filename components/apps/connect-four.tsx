import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useId,
} from 'react';
import clsx from 'clsx';
import GameLayout from './GameLayout';
import usePersistentState from '../../hooks/usePersistentState';
import usePrefersReducedMotion from '../../hooks/usePrefersReducedMotion';
import useIsTouchDevice from '../../hooks/useIsTouchDevice';
import { SettingsProvider, useSettings } from './GameSettingsContext';
import {
  COLS,
  ROWS,
  createEmptyBoard,
  evaluateColumns,
  getBestMove,
  getValidRow,
  getWinningCells,
  isBoardFull,
  type Cell,
  type WinningCell,
} from '../../games/connect-four/solver';
import { consumeGameKey, shouldHandleGameKey } from '../../utils/gameInput';

const GAP = 6;
const MIN_CELL = 32;
const MAX_CELL = 64;

const clamp = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), max);

const PALETTES = {
  default: {
    label: 'Blue/Orange',
    tokens: {
      red: {
        label: 'Blue',
        primary: '#3b82f6',
        secondary: '#1d4ed8',
        highlight: '#93c5fd',
      },
      yellow: {
        label: 'Orange',
        primary: '#fb923c',
        secondary: '#c2410c',
        highlight: '#fed7aa',
      },
    },
    hints: {
      positive: [34, 197, 94],
      negative: [239, 68, 68],
    },
  },
  protanopia: {
    label: 'Teal/Gold',
    tokens: {
      red: {
        label: 'Teal',
        primary: '#14b8a6',
        secondary: '#0f766e',
        highlight: '#99f6e4',
      },
      yellow: {
        label: 'Gold',
        primary: '#f59e0b',
        secondary: '#b45309',
        highlight: '#fde68a',
      },
    },
    hints: {
      positive: [20, 184, 166],
      negative: [245, 158, 11],
    },
  },
  deuteranopia: {
    label: 'Purple/Sand',
    tokens: {
      red: {
        label: 'Purple',
        primary: '#8b5cf6',
        secondary: '#5b21b6',
        highlight: '#ddd6fe',
      },
      yellow: {
        label: 'Sand',
        primary: '#fbbf24',
        secondary: '#b45309',
        highlight: '#fef3c7',
      },
    },
    hints: {
      positive: [139, 92, 246],
      negative: [251, 191, 36],
    },
  },
  tritanopia: {
    label: 'Magenta/Cyan',
    tokens: {
      red: {
        label: 'Magenta',
        primary: '#ec4899',
        secondary: '#9d174d',
        highlight: '#fbcfe8',
      },
      yellow: {
        label: 'Cyan',
        primary: '#06b6d4',
        secondary: '#0e7490',
        highlight: '#cffafe',
      },
    },
    hints: {
      positive: [6, 182, 212],
      negative: [236, 72, 153],
    },
  },
};

type Token = Exclude<Cell, null>;

type MatchMode = 'single' | 'best_of_3';

type MatchState = {
  red: number;
  yellow: number;
  draws: number;
  games: number;
  matchWinner: Token | null;
};

type CpuStats = {
  wins: number;
  losses: number;
  draws: number;
  streak: number;
};

type LocalStats = {
  redWins: number;
  yellowWins: number;
  draws: number;
};

type StatsState = {
  cpu: Record<'easy' | 'normal' | 'hard', CpuStats>;
  local: LocalStats;
};

const DEFAULT_MATCH_STATE: MatchState = {
  red: 0,
  yellow: 0,
  draws: 0,
  games: 0,
  matchWinner: null,
};

const DEFAULT_STATS: StatsState = {
  cpu: {
    easy: { wins: 0, losses: 0, draws: 0, streak: 0 },
    normal: { wins: 0, losses: 0, draws: 0, streak: 0 },
    hard: { wins: 0, losses: 0, draws: 0, streak: 0 },
  },
  local: {
    redWins: 0,
    yellowWins: 0,
    draws: 0,
  },
};

const opponentOf = (p: Token) => (p === 'red' ? 'yellow' : 'red');

const cloneBoard = (board: Cell[][]) => board.map((row) => row.slice());

const depthForDifficulty = (difficulty: 'easy' | 'normal' | 'hard') => {
  if (difficulty === 'easy') return 2;
  if (difficulty === 'hard') return 6;
  return 4;
};

const isMode = (v: unknown): v is 'cpu' | 'local' => v === 'cpu' || v === 'local';
const isToken = (v: unknown): v is Token => v === 'red' || v === 'yellow';
const isBool = (v: unknown): v is boolean => typeof v === 'boolean';
const isMatchMode = (v: unknown): v is MatchMode => v === 'single' || v === 'best_of_3';
const isMatchState = (v: unknown): v is MatchState =>
  Boolean(
    v &&
      typeof v === 'object' &&
      typeof (v as MatchState).red === 'number' &&
      typeof (v as MatchState).yellow === 'number' &&
      typeof (v as MatchState).draws === 'number' &&
      typeof (v as MatchState).games === 'number',
  );
const isStatsState = (v: unknown): v is StatsState =>
  Boolean(
    v &&
      typeof v === 'object' &&
      (v as StatsState).cpu &&
      (v as StatsState).local,
  );

const getHintStyle = (
  score: number | null,
  paletteName: keyof typeof PALETTES,
  highContrast: boolean,
) => {
  if (typeof score !== 'number') return undefined;
  const mag = Math.min(1, Math.abs(score) / 12);
  const alpha = (highContrast ? 0.12 : 0.06) + mag * (highContrast ? 0.32 : 0.22);
  const palette = PALETTES[paletteName] ?? PALETTES.default;
  const color = score >= 0 ? palette.hints.positive : palette.hints.negative;
  return { backgroundColor: `rgba(${color[0]}, ${color[1]}, ${color[2]}, ${alpha})` };
};

const buildTokenGradient = (primary: string, secondary: string, highlight: string) =>
  `radial-gradient(circle at 30% 30%, ${highlight}, ${primary} 45%, ${secondary} 100%)`;

const PATTERNS: Record<Token, string> = {
  red: 'radial-gradient(circle at 25% 25%, rgba(255,255,255,0.7) 0 18%, transparent 20%)',
  yellow: 'repeating-linear-gradient(45deg, rgba(255,255,255,0.6) 0 4px, transparent 4px 8px)',
};

function ConnectFourInner({ windowMeta }: { windowMeta?: { isFocused?: boolean } }) {
  const isFocused = windowMeta?.isFocused ?? true;
  const prefersReducedMotion = usePrefersReducedMotion();
  const isTouch = useIsTouchDevice();
  const {
    difficulty,
    assists,
    setDifficulty,
    setAssists,
    palette,
    setPalette,
    highContrast,
    setHighContrast,
    quality,
    setQuality,
  } = useSettings();
  const normalizedQuality = Number.isFinite(quality) ? quality : 1;

  const [mode, setMode] = usePersistentState('connect_four:mode', 'cpu', isMode);
  const [humanToken, setHumanToken] = usePersistentState(
    'connect_four:human_token',
    'yellow',
    isToken,
  );
  const [humanStarts, setHumanStarts] = usePersistentState(
    'connect_four:human_starts',
    true,
    isBool,
  );
  const [matchMode, setMatchMode] = usePersistentState<MatchMode>(
    'connect_four:match_mode',
    'single',
    isMatchMode,
  );
  const [matchState, setMatchState] = usePersistentState<MatchState>(
    'connect_four:match_state',
    DEFAULT_MATCH_STATE,
    isMatchState,
  );
  const [stats, setStats] = usePersistentState<StatsState>(
    'connect_four:stats',
    DEFAULT_STATS,
    isStatsState,
  );
  const [confirmMove, setConfirmMove] = usePersistentState(
    'connect_four:confirm_move',
    isTouch,
    isBool,
  );
  const [showPatterns, setShowPatterns] = usePersistentState(
    'connect_four:show_patterns',
    false,
    isBool,
  );

  const aiToken = useMemo(() => opponentOf(humanToken), [humanToken]);

  const paletteConfig = useMemo(
    () => PALETTES[palette] ?? PALETTES.default,
    [palette],
  );

  const tokenNames = useMemo(
    () => ({
      red: paletteConfig.tokens.red.label,
      yellow: paletteConfig.tokens.yellow.label,
    }),
    [paletteConfig],
  );

  const initialPlayer = useCallback((): Token => {
    if (mode === 'local') return 'red';
    return humanStarts ? humanToken : aiToken;
  }, [aiToken, humanStarts, humanToken, mode]);

  const [board, setBoard] = useState(() => createEmptyBoard());
  const [currentPlayer, setCurrentPlayer] = useState<Token>(() => initialPlayer());
  const [winner, setWinner] = useState<Token | 'draw' | null>(null);
  const [winningCells, setWinningCells] = useState<WinningCell[]>([]);
  const [history, setHistory] = useState<
    Array<{
      board: Cell[][];
      currentPlayer: Token;
      winner: Token | 'draw' | null;
      winningCells: WinningCell[];
    }>
  >([]);

  const [selectedCol, setSelectedCol] = useState(3);
  const [hoverCol, setHoverCol] = useState<number | null>(null);
  const [hintScores, setHintScores] = useState<(number | null)[]>(() =>
    Array(COLS).fill(null),
  );
  const [pendingConfirm, setPendingConfirm] = useState(false);

  const [animDisc, setAnimDisc] = useState<{
    col: number;
    token: Token;
    y: number;
    size: number;
  } | null>(null);

  const [aiThinking, setAiThinking] = useState(false);
  const [liveMessage, setLiveMessage] = useState('');

  const boardRef = useRef(board);
  const currentPlayerRef = useRef(currentPlayer);
  const winnerRef = useRef(winner);
  const winningCellsRef = useRef(winningCells);
  const aiTaskIdRef = useRef(0);
  const workerRef = useRef<Worker | null>(null);

  const animRef = useRef<{
    col: number;
    row: number;
    token: Token;
    y: number;
    vy: number;
    target: number;
    slot: number;
    size: number;
  } | null>(null);
  const rafRef = useRef(0);
  const lastTimeRef = useRef<number | null>(null);

  const boardWrapperRef = useRef<HTMLDivElement | null>(null);
  const layoutRef = useRef({
    cellSize: 44,
    gap: GAP,
    slot: 44 + GAP,
    boardWidth: 44 * COLS + GAP * (COLS - 1),
    boardHeight: 44 * ROWS + GAP * (ROWS - 1),
  });
  const [layout, setLayout] = useState(layoutRef.current);

  const statusId = useId();
  const instructionsId = useId();

  const outcomeLoggedRef = useRef(false);

  useEffect(() => {
    boardRef.current = board;
  }, [board]);

  useEffect(() => {
    currentPlayerRef.current = currentPlayer;
  }, [currentPlayer]);

  useEffect(() => {
    winnerRef.current = winner;
  }, [winner]);

  useEffect(() => {
    winningCellsRef.current = winningCells;
  }, [winningCells]);

  useEffect(() => {
    layoutRef.current = layout;
  }, [layout]);

  useEffect(() => {
    if (!boardWrapperRef.current) return;
    const updateSize = () => {
      if (!boardWrapperRef.current) return;
      const width = boardWrapperRef.current.getBoundingClientRect().width;
      if (!width) return;
      const available = Math.max(0, width - 16);
      const cellSize = clamp(
        Math.floor((available - GAP * (COLS - 1)) / COLS),
        MIN_CELL,
        MAX_CELL,
      );
      const boardWidth = cellSize * COLS + GAP * (COLS - 1);
      const boardHeight = cellSize * ROWS + GAP * (ROWS - 1);
      setLayout({
        cellSize,
        gap: GAP,
        slot: cellSize + GAP,
        boardWidth,
        boardHeight,
      });
    };
    updateSize();
    let observer: ResizeObserver | null = null;
    if (typeof ResizeObserver !== 'undefined') {
      observer = new ResizeObserver(updateSize);
      observer.observe(boardWrapperRef.current);
    } else {
      window.addEventListener('resize', updateSize);
    }
    return () => {
      if (observer) observer.disconnect();
      else window.removeEventListener('resize', updateSize);
    };
  }, []);

  useEffect(() => {
    if (!isFocused) {
      setHoverCol(null);
    }
  }, [isFocused]);

  const cancelAnimation = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = 0;
    animRef.current = null;
    lastTimeRef.current = null;
    setAnimDisc(null);
  }, []);

  const hardReset = useCallback(() => {
    aiTaskIdRef.current += 1;
    cancelAnimation();
    setBoard(createEmptyBoard());
    setCurrentPlayer(initialPlayer());
    setWinner(null);
    setWinningCells([]);
    setHistory([]);
    setSelectedCol(3);
    setHoverCol(null);
    setPendingConfirm(false);
    setAiThinking(false);
  }, [cancelAnimation, initialPlayer]);

  const resetMatch = useCallback(() => {
    setMatchState(DEFAULT_MATCH_STATE);
    hardReset();
  }, [hardReset, setMatchState]);

  useEffect(() => {
    // Keep game state consistent when mode or sides are changed.
    hardReset();
  }, [mode, humanToken, humanStarts, hardReset]);

  const handleMatchModeChange = useCallback(
    (nextMode: MatchMode) => {
      setMatchMode(nextMode);
      setMatchState(DEFAULT_MATCH_STATE);
    },
    [setMatchMode, setMatchState],
  );

  const commitMove = useCallback((col: number, row: number, token: Token) => {
    const prev = boardRef.current;
    const next = cloneBoard(prev);
    next[row][col] = token;

    setBoard(next);

    const win = getWinningCells(next, token);
    if (win) {
      setWinner(token);
      setWinningCells(win);
      return;
    }
    if (isBoardFull(next)) {
      setWinner('draw');
      setWinningCells([]);
      return;
    }

    setWinningCells([]);
    setCurrentPlayer(opponentOf(token));
  }, []);

  const step = useCallback(
    (timestamp: number) => {
      const anim = animRef.current;
      if (!anim) {
        rafRef.current = 0;
        lastTimeRef.current = null;
        return;
      }

      const last = lastTimeRef.current ?? timestamp;
      const dt = Math.min(0.032, (timestamp - last) / 1000);
      lastTimeRef.current = timestamp;

      const GRAVITY = 5200; // px / s^2
      anim.vy += GRAVITY * dt;
      anim.y += anim.vy * dt;

      if (anim.y >= anim.target) {
        commitMove(anim.col, anim.row, anim.token);
        animRef.current = null;
        setAnimDisc(null);
        rafRef.current = 0;
        lastTimeRef.current = null;
        return;
      }

      setAnimDisc({ col: anim.col, token: anim.token, y: anim.y, size: anim.size });
      rafRef.current = requestAnimationFrame(step);
    },
    [commitMove],
  );

  const startDrop = useCallback(
    (col: number, token: Token, source: 'player' | 'ai' = 'player') => {
      if (winnerRef.current) return;
      if (animRef.current) return;

      const row = getValidRow(boardRef.current, col);
      if (row === -1) {
        if (source === 'player') {
          setLiveMessage(`Column ${col + 1} is full.`);
        }
        return;
      }

      setPendingConfirm(false);
      setHistory((h) => [
        ...h,
        {
          board: cloneBoard(boardRef.current),
          currentPlayer: currentPlayerRef.current,
          winner: winnerRef.current,
          winningCells: winningCellsRef.current,
        },
      ]);

      const { slot, cellSize } = layoutRef.current;

      if (prefersReducedMotion || normalizedQuality <= 0) {
        commitMove(col, row, token);
        return;
      }

      animRef.current = {
        col,
        row,
        token,
        y: -slot,
        vy: 0,
        target: row * slot,
        slot,
        size: cellSize,
      };
      setAnimDisc({ col, token, y: -slot, size: cellSize });
      lastTimeRef.current = null;
      rafRef.current = requestAnimationFrame(step);
    },
    [commitMove, normalizedQuality, prefersReducedMotion, step],
  );

  useEffect(() => {
    if (typeof Worker !== 'function') return;
    workerRef.current = new Worker(new URL('./connect-four.worker.js', import.meta.url));
    workerRef.current.onmessage = (event) => {
      const { taskId, column } = event.data || {};
      if (aiTaskIdRef.current !== taskId) return;
      setAiThinking(false);
      if (winnerRef.current) return;
      if (animRef.current) return;
      if (currentPlayerRef.current !== aiToken) return;
      if (typeof column !== 'number') return;
      startDrop(column, aiToken, 'ai');
    };
    return () => workerRef.current?.terminate();
  }, [aiToken, startDrop]);

  const undo = useCallback(() => {
    if (animRef.current) return;

    aiTaskIdRef.current += 1;
    setAiThinking(false);

    setHistory((h) => {
      if (h.length === 0) return h;

      const popOne = (arr: typeof h) => {
        const nextArr = arr.slice(0, -1);
        const state = arr[arr.length - 1];
        return { nextArr, state };
      };

      let nextHistory = h;
      let state;

      ({ nextArr: nextHistory, state } = popOne(nextHistory));

      if (mode === 'cpu') {
        while (state && state.currentPlayer !== humanToken && nextHistory.length) {
          ({ nextArr: nextHistory, state } = popOne(nextHistory));
        }
      }

      if (!state) return h;

      cancelAnimation();
      setBoard(state.board);
      setCurrentPlayer(state.currentPlayer);
      setWinner(state.winner);
      setWinningCells(state.winningCells || []);
      setPendingConfirm(false);

      return nextHistory;
    });
  }, [cancelAnimation, humanToken, mode]);

  const isMatchComplete = matchMode !== 'single' && Boolean(matchState.matchWinner);
  const canInteract =
    !winner &&
    !animDisc &&
    !isMatchComplete &&
    (mode === 'local' || currentPlayer === humanToken);

  const effectiveCol = hoverCol ?? selectedCol;

  const selectColumn = useCallback(
    (col: number, source: 'pointer' | 'keyboard') => {
      if (!canInteract) return;
      if (col < 0 || col >= COLS) return;
      if (source === 'pointer' && confirmMove) {
        if (selectedCol === col && pendingConfirm) {
          setPendingConfirm(false);
          startDrop(col, currentPlayer);
          return;
        }
        setSelectedCol(col);
        setPendingConfirm(true);
        setLiveMessage(`Column ${col + 1} selected. Tap again to drop.`);
        return;
      }
      if (source === 'keyboard') {
        setPendingConfirm(false);
        setSelectedCol(col);
        return;
      }
      startDrop(col, currentPlayer);
    },
    [canInteract, confirmMove, currentPlayer, pendingConfirm, selectedCol, startDrop],
  );

  const onKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      if (!shouldHandleGameKey(e.nativeEvent, { isFocused })) return;
      if (e.key === 'ArrowLeft') {
        consumeGameKey(e.nativeEvent);
        setSelectedCol((c) => (c + COLS - 1) % COLS);
        setPendingConfirm(false);
        return;
      }
      if (e.key === 'ArrowRight') {
        consumeGameKey(e.nativeEvent);
        setSelectedCol((c) => (c + 1) % COLS);
        setPendingConfirm(false);
        return;
      }
      if (e.key === 'Home') {
        consumeGameKey(e.nativeEvent);
        setSelectedCol(0);
        setPendingConfirm(false);
        return;
      }
      if (e.key === 'End') {
        consumeGameKey(e.nativeEvent);
        setSelectedCol(COLS - 1);
        setPendingConfirm(false);
        return;
      }
      if (e.key === 'Enter' || e.key === ' ') {
        consumeGameKey(e.nativeEvent);
        if (!canInteract) return;
        startDrop(effectiveCol, currentPlayer);
        return;
      }
      if (e.key.toLowerCase() === 'u') {
        consumeGameKey(e.nativeEvent);
        undo();
        return;
      }
      if (e.key.toLowerCase() === 'r') {
        consumeGameKey(e.nativeEvent);
        hardReset();
      }
    },
    [canInteract, currentPlayer, effectiveCol, hardReset, isFocused, startDrop, undo],
  );

  useEffect(() => {
    if (!assists) {
      setHintScores(Array(COLS).fill(null));
      return;
    }
    setHintScores(evaluateColumns(board, currentPlayer));
  }, [assists, board, currentPlayer]);

  useEffect(() => {
    setPendingConfirm(false);
  }, [confirmMove, currentPlayer, mode, winner]);

  useEffect(() => {
    if (mode !== 'cpu') return;
    if (winner) return;
    if (animRef.current) return;
    if (currentPlayer !== aiToken) return;

    const taskId = aiTaskIdRef.current + 1;
    aiTaskIdRef.current = taskId;

    const depth = depthForDifficulty(difficulty);

    if (workerRef.current) {
      setAiThinking(true);
      workerRef.current.postMessage({
        taskId,
        board: boardRef.current,
        depth,
        player: aiToken,
      });
      return undefined;
    }

    setAiThinking(true);
    const timer = setTimeout(() => {
      const current = boardRef.current;
      const { column } = getBestMove(current, depth, aiToken);

      if (aiTaskIdRef.current !== taskId) return;
      if (winnerRef.current) return;
      if (animRef.current) return;
      if (currentPlayerRef.current !== aiToken) return;

      setAiThinking(false);
      startDrop(column, aiToken, 'ai');
    }, 30);

    return () => clearTimeout(timer);
  }, [aiToken, currentPlayer, difficulty, mode, startDrop, winner]);

  useEffect(() => () => cancelAnimation(), [cancelAnimation]);

  useEffect(() => {
    if (winner) {
      const message =
        winner === 'draw'
          ? 'Draw.'
          : `${tokenNames[winner]} wins.`;
      setLiveMessage(message);
      return;
    }
    if (mode === 'cpu' && currentPlayer === aiToken) {
      setLiveMessage(`${tokenNames[aiToken]} is thinking...`);
      return;
    }
    setLiveMessage(`Turn: ${tokenNames[currentPlayer]}.`);
  }, [aiToken, currentPlayer, mode, tokenNames, winner]);

  useEffect(() => {
    if (!winner) {
      outcomeLoggedRef.current = false;
      return;
    }
    if (outcomeLoggedRef.current) return;
    outcomeLoggedRef.current = true;

    if (mode === 'cpu') {
      const nextStats = { ...stats, cpu: { ...stats.cpu } };
      const record = { ...nextStats.cpu[difficulty] };
      if (winner === 'draw') {
        record.draws += 1;
        record.streak = 0;
      } else if (winner === humanToken) {
        record.wins += 1;
        record.streak += 1;
      } else {
        record.losses += 1;
        record.streak = 0;
      }
      nextStats.cpu[difficulty] = record;
      setStats(nextStats);
    }

    if (mode === 'local') {
      const nextStats = { ...stats, local: { ...stats.local } };
      if (winner === 'draw') {
        nextStats.local.draws += 1;
      } else if (winner === 'red') {
        nextStats.local.redWins += 1;
      } else if (winner === 'yellow') {
        nextStats.local.yellowWins += 1;
      }
      setStats(nextStats);
    }

    if (matchMode !== 'single') {
      setMatchState((prev) => {
        const next = { ...prev };
        if (winner === 'draw') next.draws += 1;
        else if (winner === 'red') next.red += 1;
        else if (winner === 'yellow') next.yellow += 1;
        next.games += 1;
        const target = matchMode === 'best_of_3' ? 2 : 3;
        if (!next.matchWinner) {
          if (next.red >= target) next.matchWinner = 'red';
          if (next.yellow >= target) next.matchWinner = 'yellow';
        }
        return next;
      });
    }
  }, [difficulty, humanToken, matchMode, mode, setMatchState, setStats, stats, winner]);

  const statusText = useMemo(() => {
    if (winner === 'draw') return 'Draw.';
    if (winner === 'red' || winner === 'yellow') return `${tokenNames[winner]} wins.`;
    if (mode === 'cpu' && (currentPlayer === aiToken || aiThinking))
      return `${tokenNames[aiToken]} is thinking...`;
    return `Turn: ${tokenNames[currentPlayer]}.`;
  }, [aiThinking, aiToken, currentPlayer, mode, tokenNames, winner]);

  const settingsPanel = (
    <div className="space-y-4 text-sm">
      <div>
        <div className="text-xs uppercase tracking-wider text-gray-400">Mode</div>
        <div className="mt-2 flex flex-wrap gap-2">
          <button
            type="button"
            className={`px-3 py-1 rounded border ${
              mode === 'cpu' ? 'border-gray-200 text-white' : 'border-gray-600 text-gray-300'
            }`}
            onClick={() => setMode('cpu')}
          >
            vs CPU
          </button>
          <button
            type="button"
            className={`px-3 py-1 rounded border ${
              mode === 'local' ? 'border-gray-200 text-white' : 'border-gray-600 text-gray-300'
            }`}
            onClick={() => setMode('local')}
          >
            2 Players
          </button>
        </div>
      </div>

      <div>
        <div className="text-xs uppercase tracking-wider text-gray-400">Match</div>
        <div className="mt-2 flex flex-wrap gap-2">
          <button
            type="button"
            className={`px-3 py-1 rounded border ${
              matchMode === 'single' ? 'border-gray-200 text-white' : 'border-gray-600 text-gray-300'
            }`}
            onClick={() => handleMatchModeChange('single')}
          >
            Single
          </button>
          <button
            type="button"
            className={`px-3 py-1 rounded border ${
              matchMode === 'best_of_3'
                ? 'border-gray-200 text-white'
                : 'border-gray-600 text-gray-300'
            }`}
            onClick={() => handleMatchModeChange('best_of_3')}
          >
            Best of 3
          </button>
        </div>
        {matchMode !== 'single' && (
          <div className="mt-2 text-xs text-gray-400">
            First to 2 wins takes the match.
          </div>
        )}
      </div>

      <div>
        <div className="text-xs uppercase tracking-wider text-gray-400">Difficulty</div>
        <div className="mt-2 flex flex-wrap gap-2">
          {['easy', 'normal', 'hard'].map((d) => (
            <button
              key={d}
              type="button"
              className={`px-3 py-1 rounded border ${
                difficulty === d ? 'border-gray-200 text-white' : 'border-gray-600 text-gray-300'
              }`}
              onClick={() => setDifficulty(d as 'easy' | 'normal' | 'hard')}
            >
              {d}
            </button>
          ))}
        </div>
      </div>

      <div>
        <div className="text-xs uppercase tracking-wider text-gray-400">Assists</div>
        <div className="mt-2 flex items-center gap-2">
          <button
            type="button"
            className={`px-3 py-1 rounded border ${
              assists ? 'border-gray-200 text-white' : 'border-gray-600 text-gray-300'
            }`}
            onClick={() => setAssists(!assists)}
          >
            {assists ? 'On' : 'Off'}
          </button>
          <span className="text-xs text-gray-400">Shows column hints.</span>
        </div>
      </div>

      <div>
        <div className="text-xs uppercase tracking-wider text-gray-400">Palette</div>
        <div className="mt-2 flex flex-wrap gap-2">
          {(Object.keys(PALETTES) as Array<keyof typeof PALETTES>).map((name) => (
            <button
              key={name}
              type="button"
              className={`px-3 py-1 rounded border ${
                palette === name ? 'border-gray-200 text-white' : 'border-gray-600 text-gray-300'
              }`}
              onClick={() => setPalette(name)}
            >
              {PALETTES[name].label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <div className="text-xs uppercase tracking-wider text-gray-400">Contrast</div>
        <div className="mt-2 flex items-center gap-2">
          <button
            type="button"
            className={`px-3 py-1 rounded border ${
              highContrast ? 'border-gray-200 text-white' : 'border-gray-600 text-gray-300'
            }`}
            onClick={() => setHighContrast(!highContrast)}
          >
            {highContrast ? 'High' : 'Standard'}
          </button>
          <span className="text-xs text-gray-400">Boosts outlines and focus.</span>
        </div>
      </div>

      <div>
        <div className="text-xs uppercase tracking-wider text-gray-400">Quality</div>
        <div className="mt-2 flex flex-wrap gap-2">
          {[0, 1, 2].map((val) => (
            <button
              key={val}
              type="button"
              className={`px-3 py-1 rounded border ${
                quality === val ? 'border-gray-200 text-white' : 'border-gray-600 text-gray-300'
              }`}
              onClick={() => setQuality(val)}
            >
              {val === 0 ? 'Low' : val === 1 ? 'Standard' : 'High'}
            </button>
          ))}
        </div>
      </div>

      <div>
        <div className="text-xs uppercase tracking-wider text-gray-400">Confirm move</div>
        <div className="mt-2 flex items-center gap-2">
          <button
            type="button"
            className={`px-3 py-1 rounded border ${
              confirmMove ? 'border-gray-200 text-white' : 'border-gray-600 text-gray-300'
            }`}
            onClick={() => setConfirmMove(!confirmMove)}
          >
            {confirmMove ? 'On' : 'Off'}
          </button>
          <span className="text-xs text-gray-400">Tap twice to drop.</span>
        </div>
      </div>

      <div>
        <div className="text-xs uppercase tracking-wider text-gray-400">Token patterns</div>
        <div className="mt-2 flex items-center gap-2">
          <button
            type="button"
            className={`px-3 py-1 rounded border ${
              showPatterns ? 'border-gray-200 text-white' : 'border-gray-600 text-gray-300'
            }`}
            onClick={() => setShowPatterns(!showPatterns)}
          >
            {showPatterns ? 'On' : 'Off'}
          </button>
          <span className="text-xs text-gray-400">Adds dots/stripes to discs.</span>
        </div>
      </div>

      {mode === 'cpu' && (
        <div className="space-y-4">
          <div>
            <div className="text-xs uppercase tracking-wider text-gray-400">You play as</div>
            <div className="mt-2 flex flex-wrap gap-2">
              {(['red', 'yellow'] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  className={`px-3 py-1 rounded border ${
                    humanToken === t
                      ? 'border-gray-200 text-white'
                      : 'border-gray-600 text-gray-300'
                  }`}
                  onClick={() => setHumanToken(t)}
                >
                  {tokenNames[t]}
                </button>
              ))}
            </div>
          </div>

          <div>
            <div className="text-xs uppercase tracking-wider text-gray-400">First move</div>
            <div className="mt-2 flex flex-wrap gap-2">
              <button
                type="button"
                className={`px-3 py-1 rounded border ${
                  humanStarts ? 'border-gray-200 text-white' : 'border-gray-600 text-gray-300'
                }`}
                onClick={() => setHumanStarts(true)}
              >
                You
              </button>
              <button
                type="button"
                className={`px-3 py-1 rounded border ${
                  !humanStarts ? 'border-gray-200 text-white' : 'border-gray-600 text-gray-300'
                }`}
                onClick={() => setHumanStarts(false)}
              >
                CPU
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="rounded border border-gray-700/60 p-3 text-xs text-gray-400">
        <div className="font-semibold text-gray-200">Stats</div>
        {mode === 'cpu' ? (
          <div className="mt-2 space-y-1">
            <div>
              Difficulty {difficulty}:{' '}
              {stats.cpu[difficulty].wins}W / {stats.cpu[difficulty].losses}L /{' '}
              {stats.cpu[difficulty].draws}D
            </div>
            <div>Win streak: {stats.cpu[difficulty].streak}</div>
          </div>
        ) : (
          <div className="mt-2 space-y-1">
            <div>{tokenNames.red}: {stats.local.redWins} wins</div>
            <div>{tokenNames.yellow}: {stats.local.yellowWins} wins</div>
            <div>Draws: {stats.local.draws}</div>
          </div>
        )}
      </div>

      <div className="pt-2 border-t border-gray-700 space-y-2">
        <button type="button" className="px-3 py-1 rounded border border-gray-600" onClick={hardReset}>
          New Game
        </button>
        {matchMode !== 'single' && (
          <button
            type="button"
            className="px-3 py-1 rounded border border-gray-600"
            onClick={resetMatch}
          >
            New Match
          </button>
        )}
      </div>
    </div>
  );

  const winningSet = useMemo(() => {
    const s = new Set<string>();
    for (const c of winningCells) s.add(`${c.r}:${c.c}`);
    return s;
  }, [winningCells]);

  const ghostRow = useMemo(() => {
    if (!canInteract) return -1;
    if (effectiveCol == null) return -1;
    return getValidRow(board, effectiveCol);
  }, [board, canInteract, effectiveCol]);

  const ghostDiscStyle = useMemo(() => {
    if (ghostRow === -1 || effectiveCol == null) return null;
    const { slot, cellSize } = layout;
    return {
      left: effectiveCol * slot,
      top: ghostRow * slot,
      width: cellSize,
      height: cellSize,
    } as React.CSSProperties;
  }, [effectiveCol, ghostRow, layout]);

  const renderToken = (token: Token, size: number, isGhost = false) => {
    const tokenConfig = paletteConfig.tokens[token];
    const gradient = buildTokenGradient(
      tokenConfig.primary,
      tokenConfig.secondary,
      tokenConfig.highlight,
    );
    return (
      <div
        className={clsx(
          'relative rounded-full transition-transform',
          normalizedQuality > 0 && 'shadow-lg',
          highContrast ? 'ring-2 ring-white/70' : 'ring-1 ring-black/30',
        )}
        style={{
          width: size,
          height: size,
          backgroundImage: gradient,
          opacity: isGhost ? 0.45 : 1,
          filter: isGhost ? 'saturate(0.9)' : 'none',
        }}
      >
        {showPatterns && (
          <div
            className="absolute inset-0 rounded-full"
            style={{
              backgroundImage: PATTERNS[token],
              opacity: isGhost ? 0.4 : 0.55,
              mixBlendMode: 'screen',
            }}
          />
        )}
      </div>
    );
  };

  return (
    <GameLayout
      gameId="connect-four"
      onRestart={hardReset}
      settingsPanel={settingsPanel}
      isFocused={isFocused}
    >
      <div className="flex flex-col items-center gap-4 p-4 text-white">
        <div className="w-full max-w-2xl" ref={boardWrapperRef}>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="text-sm text-gray-200" id={statusId}>
                {statusText}
              </div>
              <div className="text-xs text-gray-400">
                {mode === 'cpu'
                  ? `You: ${tokenNames[humanToken]} | CPU: ${tokenNames[aiToken]}`
                  : 'Local match'}
              </div>
              {matchMode !== 'single' && (
                <div className="mt-1 text-xs text-gray-400">
                  Match: {matchState.red}-{matchState.yellow}
                  {matchState.draws ? ` (${matchState.draws} draws)` : ''}
                </div>
              )}
            </div>
            <div className="text-right text-xs text-gray-400" id={instructionsId}>
              <div>Arrows: select column</div>
              <div>Enter/Space: drop</div>
              <div>U: undo, R: restart</div>
            </div>
          </div>
        </div>

        <div className="sr-only" aria-live="polite">
          {liveMessage}
        </div>

        <div
          className={clsx(
            'outline-none rounded-xl',
            highContrast ? 'ring-2 ring-cyan-300/80' : 'ring-1 ring-transparent',
          )}
          tabIndex={0}
          onKeyDown={onKeyDown}
          aria-label="Connect Four board"
          aria-describedby={`${statusId} ${instructionsId}`}
        >
          <div
            className={clsx(
              'relative rounded-2xl p-3',
              normalizedQuality > 0 ? 'shadow-xl' : 'shadow-none',
              highContrast ? 'border-2 border-gray-100/80' : 'border border-gray-700/70',
            )}
            style={{
              width: layout.boardWidth + 24,
              background:
                normalizedQuality > 0
                  ? 'linear-gradient(145deg, rgba(15,23,42,0.95), rgba(30,41,59,0.95))'
                  : 'rgba(15,23,42,0.9)',
            }}
          >
            <div
              className="relative grid grid-rows-6 grid-cols-7"
              style={{
                width: layout.boardWidth,
                height: layout.boardHeight,
                gap: `${layout.gap}px`,
              }}
              role="grid"
              aria-rowcount={ROWS}
              aria-colcount={COLS}
            >
              {board.map((row, r) =>
                row.map((cell, c) => {
                  const isWin = winningSet.has(`${r}:${c}`);
                  return (
                    <div
                      key={`${r}-${c}`}
                      className={clsx(
                        'rounded-full flex items-center justify-center',
                        highContrast ? 'border-2 border-white/60' : 'border border-slate-700',
                        isWin &&
                          (prefersReducedMotion
                            ? 'ring-2 ring-cyan-400'
                            : 'ring-2 ring-cyan-300 animate-pulse'),
                      )}
                      style={{
                        width: layout.cellSize,
                        height: layout.cellSize,
                        backgroundColor: 'rgba(2,6,23,0.65)',
                      }}
                      aria-label={`Row ${r + 1} column ${c + 1}. ${cell ? tokenNames[cell] : 'Empty'}.`}
                      role="gridcell"
                      data-testid={`connect-four-cell-${r}-${c}`}
                      data-token={cell ?? ''}
                    >
                      {cell && renderToken(cell, Math.max(10, layout.cellSize - 12))}
                    </div>
                  );
                }),
              )}

              {ghostDiscStyle && ghostRow !== -1 && currentPlayer && (
                <div
                  className="absolute pointer-events-none"
                  style={ghostDiscStyle}
                >
                  {renderToken(currentPlayer, layout.cellSize, true)}
                </div>
              )}

              {animDisc && (
                <div
                  className="absolute pointer-events-none"
                  style={{
                    left: animDisc.col * layout.slot,
                    top: animDisc.y,
                    width: animDisc.size,
                    height: animDisc.size,
                  }}
                >
                  {renderToken(animDisc.token, animDisc.size)}
                </div>
              )}
            </div>

            <div
              className="absolute inset-0 grid grid-cols-7"
              style={{ gap: `${layout.gap}px` }}
            >
              {Array.from({ length: COLS }, (_, col) => {
                const colFull = getValidRow(board, col) === -1;
                const isSelected = effectiveCol === col;
                const score = hintScores[col];
                const disabled = colFull || !canInteract;

                const labelParts = [`Column ${col + 1}`];
                if (colFull) labelParts.push('Full');
                if (confirmMove) labelParts.push('Tap twice to drop');
                if (assists && typeof score === 'number')
                  labelParts.push(`Hint score ${Math.round(score)}`);
                const ariaLabel = labelParts.join('. ');

                return (
                  <button
                    key={col}
                    type="button"
                    aria-label={ariaLabel}
                    aria-pressed={isSelected}
                    disabled={disabled}
                    onMouseEnter={() => setHoverCol(col)}
                    onMouseLeave={() => setHoverCol(null)}
                    onFocus={() => setHoverCol(col)}
                    onBlur={() => setHoverCol(null)}
                    onClick={() => selectColumn(col, 'pointer')}
                    className={clsx(
                      'h-full rounded-xl border border-transparent transition focus:outline-none focus:ring-2',
                      disabled
                        ? 'opacity-40 cursor-not-allowed'
                        : 'hover:border-cyan-300/60 focus:ring-cyan-400',
                      isSelected && 'border-cyan-300',
                      highContrast && 'focus:ring-4',
                    )}
                    style={assists ? getHintStyle(score, palette, highContrast) : undefined}
                  >
                    <span className="sr-only">Drop in column {col + 1}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {winner && (
          <div className="flex flex-col items-center gap-2 text-sm">
            <div className="text-gray-200">{statusText}</div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 rounded"
                onClick={hardReset}
              >
                Play again
              </button>
              {matchMode !== 'single' && (
                <button
                  type="button"
                  className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded"
                  onClick={resetMatch}
                >
                  New match
                </button>
              )}
            </div>
            {isMatchComplete && matchState.matchWinner && (
              <div className="text-xs text-gray-400">
                Match winner: {tokenNames[matchState.matchWinner]}.
              </div>
            )}
          </div>
        )}

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded disabled:opacity-50 disabled:cursor-not-allowed"
            onClick={undo}
            disabled={history.length === 0 || Boolean(animDisc)}
          >
            Undo
          </button>
          <button
            type="button"
            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded"
            onClick={hardReset}
          >
            Restart
          </button>
        </div>
      </div>
    </GameLayout>
  );
}

export default function ConnectFour({ windowMeta }: { windowMeta?: { isFocused?: boolean } }) {
  return (
    <SettingsProvider>
      <ConnectFourInner windowMeta={windowMeta} />
    </SettingsProvider>
  );
}
