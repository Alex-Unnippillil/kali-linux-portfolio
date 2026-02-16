import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  SIZE,
  createBoard,
  computeLegalMoves,
  applyMove,
  countPieces,
  getBookMove,
  bestMove,
  getTurnResolution,
} from './reversiLogic';

const DIFFICULTIES = {
  easy: {
    depth: 2,
    randomizeTop: 3,
    weights: {
      mobilityStart: 7,
      mobilityEnd: 3,
      parityStart: 0,
      parityEnd: 10,
      corners: 22,
      edges: 5,
      cornerAdjPenalty: -12,
    },
  },
  medium: {
    depth: 4,
    randomizeTop: 0,
    weights: {
      mobilityStart: 8,
      mobilityEnd: 2.5,
      parityStart: 0,
      parityEnd: 12,
      corners: 26,
      edges: 6,
      cornerAdjPenalty: -12,
    },
  },
  hard: {
    depth: 5,
    randomizeTop: 0,
    weights: {
      mobilityStart: 8,
      mobilityEnd: 2,
      parityStart: 0,
      parityEnd: 14,
      corners: 28,
      edges: 6,
      cornerAdjPenalty: -14,
    },
  },
};

const DEFAULT_BOARD_SIZE = 420;
const MIN_BOARD_SIZE = 240;
const MAX_BOARD_SIZE = 520;
const SETTINGS_STORAGE_KEY = 'reversiSettings';
const WINS_STORAGE_KEY = 'reversiWins';

const BOARD_THEME = {
  boardStart: '#1a463b',
  boardMid: '#236457',
  boardEnd: '#2f7d67',
  ambientHighlight: 'rgba(255, 255, 255, 0.15)',
  ambientShadow: 'rgba(0, 0, 0, 0.45)',
  gridLight: 'rgba(255,255,255,0.35)',
  gridDark: 'rgba(0,0,0,0.5)',
  legalGlow: 'rgba(255, 240, 200, 0.45)',
  legalCore: 'rgba(255, 255, 255, 0.75)',
  hintGlow: 'rgba(120, 190, 255, 0.6)',
  hintCore: 'rgba(210, 240, 255, 0.95)',
  lastMove: 'rgba(255, 215, 0, 0.55)',
};

const Reversi = () => {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const boardWrapperRef = useRef(null);
  const boardSizeRef = useRef(DEFAULT_BOARD_SIZE);
  const boardRef = useRef(createBoard());
  const legalRef = useRef({});
  const playerRef = useRef('B');
  const pausedRef = useRef(false);
  const animRef = useRef(0);
  const audioRef = useRef(null);
  const workerRef = useRef(null);
  const aiSearchIdRef = useRef(0);
  const aiThinkingRef = useRef(false);
  const reduceMotionRef = useRef(false);
  const soundRef = useRef(true);
  const flippingRef = useRef([]);
  const previewRef = useRef(null);
  const lastMoveRef = useRef(null);
  const hintRef = useRef(null);
  const focusedCellRef = useRef({ r: 3, c: 3 });
  const boardFocusRef = useRef(false);
  const passTimeoutRef = useRef(null);
  const isPageVisibleRef = useRef(true);
  const gameOverRef = useRef(false);
  const aiProgressRef = useRef(null);

  const [board, setBoard] = useState(() => createBoard());
  const [boardSize, setBoardSize] = useState(DEFAULT_BOARD_SIZE);
  const [player, setPlayer] = useState('B');
  const [paused, setPaused] = useState(false);
  const [sound, setSound] = useState(true);
  const [message, setMessage] = useState('Your turn');
  const [wins, setWins] = useState({ player: 0, ai: 0 });
  const [mobility, setMobility] = useState({ player: 0, ai: 0 });
  const [tip, setTip] = useState('Tip: Control the corners to gain an advantage.');
  const [difficulty, setDifficulty] = useState('medium');
  const [useBook, setUseBook] = useState(true);
  const [history, setHistory] = useState([]);
  const [score, setScore] = useState(() => countPieces(board));
  const [diskTheme, setDiskTheme] = useState('dark');
  const [aiProgress, setAiProgress] = useState(null);
  const [isAiThinking, setIsAiThinking] = useState(false);
  const [focusedCell, setFocusedCell] = useState({ r: 3, c: 3 });
  const [isBoardFocused, setIsBoardFocused] = useState(false);
  const [hintMove, setHintMove] = useState(null);
  const [lastMove, setLastMove] = useState(null);
  const [gameOver, setGameOver] = useState(false);
  const [gameResult, setGameResult] = useState(null);
  const [pendingAiMove, setPendingAiMove] = useState(null);
  const [isPageVisible, setIsPageVisible] = useState(true);
  const themeRef = useRef('dark');
  const bookEnabled = React.useMemo(() => useBook, [useBook]);

  useEffect(() => {
    boardSizeRef.current = boardSize;
  }, [boardSize]);

  useEffect(() => {
    lastMoveRef.current = lastMove;
  }, [lastMove]);

  useEffect(() => {
    hintRef.current = hintMove;
  }, [hintMove]);

  useEffect(() => {
    focusedCellRef.current = focusedCell;
  }, [focusedCell]);

  useEffect(() => {
    boardFocusRef.current = isBoardFocused;
  }, [isBoardFocused]);

  useEffect(() => {
    soundRef.current = sound;
  }, [sound]);

  useEffect(() => {
    isPageVisibleRef.current = isPageVisible;
  }, [isPageVisible]);

  useEffect(() => {
    gameOverRef.current = gameOver;
  }, [gameOver]);

  useEffect(() => {
    aiProgressRef.current = aiProgress;
  }, [aiProgress]);

  // keep refs in sync
  useEffect(() => { boardRef.current = board; }, [board]);
  useEffect(() => { playerRef.current = player; }, [player]);
  useEffect(() => { pausedRef.current = paused; }, [paused]);
  useEffect(() => { themeRef.current = diskTheme; }, [diskTheme]);
  useEffect(() => { setScore(countPieces(board)); }, [board]);
  useEffect(() => () => clearTimeout(passTimeoutRef.current), []);

  useEffect(() => {
    if (typeof document === 'undefined') return;
    const handleVisibility = () => {
      setIsPageVisible(!document.hidden);
    };
    handleVisibility();
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const el = containerRef.current;
    if (!el) return;
    const updateSize = () => {
      const rect = el.getBoundingClientRect();
      if (!rect.width) return;
      const newSize = Math.min(
        Math.max(rect.width - 16, MIN_BOARD_SIZE),
        MAX_BOARD_SIZE,
      );
      setBoardSize(newSize);
    };
    updateSize();
    let observer;
    if (typeof ResizeObserver !== 'undefined') {
      observer = new ResizeObserver(updateSize);
      observer.observe(el);
    } else {
      window.addEventListener('resize', updateSize);
    }
    return () => {
      if (observer) observer.disconnect();
      else window.removeEventListener('resize', updateSize);
    };
  }, []);

  // load settings from storage
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const saved = window.localStorage.getItem(SETTINGS_STORAGE_KEY);
      if (!saved) return;
      const parsed = JSON.parse(saved);
      if (parsed?.difficulty) setDifficulty(parsed.difficulty);
      if (typeof parsed?.useBook === 'boolean') setUseBook(parsed.useBook);
      if (parsed?.diskTheme) setDiskTheme(parsed.diskTheme);
      if (typeof parsed?.sound === 'boolean') setSound(parsed.sound);
    } catch {
      /* ignore */
    }
  }, []);

  // persist settings
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      window.localStorage.setItem(
        SETTINGS_STORAGE_KEY,
        JSON.stringify({
          difficulty,
          useBook,
          diskTheme,
          sound,
        }),
      );
    } catch {
      /* ignore */
    }
  }, [difficulty, useBook, diskTheme, sound]);

  // load wins from storage
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const saved = window.localStorage.getItem(WINS_STORAGE_KEY);
      if (saved) {
        setWins(JSON.parse(saved));
      }
    } catch {
      /* ignore */
    }
  }, []);

  // persist wins
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      window.localStorage.setItem(WINS_STORAGE_KEY, JSON.stringify(wins));
    } catch {
      /* ignore */
    }
  }, [wins]);

  const playSound = React.useCallback(() => {
    if (!soundRef.current || typeof window === 'undefined') return;
    try {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (!AudioContextClass) return;
      const ctx = audioRef.current || new AudioContextClass();
      audioRef.current = ctx;
      if (ctx.state === 'suspended') {
        ctx.resume().catch(() => {});
      }
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = 500;
      osc.start();
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1);
      osc.stop(ctx.currentTime + 0.1);
    } catch {
      /* ignore */
    }
  }, []);

  const queueFlips = useCallback((r, c, player, flips, prevBoard) => {
    if (reduceMotionRef.current) return;
    const start = performance.now();
    flips.forEach(([sr, sc], idx) => {
      flippingRef.current.push({
        key: `${sr}-${sc}`,
        from: prevBoard[sr][sc],
        to: player,
        start: start + idx * 80,
        duration: 360,
      });
    });
  }, []);

  const commitMove = useCallback((r, c, mover, flipsOverride = null) => {
    const moves = computeLegalMoves(boardRef.current, mover);
    const flips = flipsOverride || moves[`${r}-${c}`];
    if (!flips) return false;
    const prev = boardRef.current.map((row) => row.slice());
    const next = applyMove(prev, r, c, mover, flips);
    queueFlips(r, c, mover, flips, prev);
    setHistory((h) => [
      ...h,
      { board: prev, player: mover, move: { r, c }, flips },
    ]);
    setBoard(next);
    setPlayer(mover === 'B' ? 'W' : 'B');
    setLastMove({ r, c, player: mover });
    setHintMove(null);
    previewRef.current = null;
    setGameOver(false);
    setFocusedCell({ r, c });
    playSound();
    return true;
  }, [playSound, queueFlips]);

  const startAiTurn = useCallback(() => {
    if (pausedRef.current || gameOverRef.current || !isPageVisibleRef.current) return;
    const bookMove = bookEnabled ? getBookMove(boardRef.current, 'W') : null;
    if (bookMove) {
      const [r, c] = bookMove;
      commitMove(r, c, 'W');
      return;
    }
    aiThinkingRef.current = true;
    setIsAiThinking(true);
    setAiProgress(null);
    const { depth, weights, randomizeTop } = DIFFICULTIES[difficulty];
    const id = aiSearchIdRef.current + 1;
    aiSearchIdRef.current = id;
    if (workerRef.current) {
      workerRef.current.postMessage({
        type: 'search',
        id,
        board: boardRef.current,
        player: 'W',
        depth,
        weights,
        randomizeTop,
      });
      return;
    }
    const move = bestMove(boardRef.current, 'W', depth, weights, {
      randomizeTop,
      onProgress: ({
        evaluated,
        total,
        candidate,
        score,
        bestMove: progressBestMove,
        bestScore,
        completed,
      }) => {
        if (aiSearchIdRef.current !== id) return;
        setAiProgress({
          evaluated,
          total,
          candidate,
          score,
          bestMove: progressBestMove,
          bestScore,
          completed,
        });
      },
    });
    aiThinkingRef.current = false;
    setIsAiThinking(false);
    setAiProgress(null);
    if (!move || aiSearchIdRef.current !== id) return;
    const [r, c] = move;
    if (pausedRef.current || !isPageVisibleRef.current) {
      setPendingAiMove({ r, c, player: 'W' });
      return;
    }
    commitMove(r, c, 'W');
  }, [bookEnabled, commitMove, difficulty]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      reduceMotionRef.current = window.matchMedia(
        '(prefers-reduced-motion: reduce)'
      ).matches;
      if (typeof Worker === 'function') {
        try {
          workerRef.current = new Worker(
            new URL('../../workers/reversi.worker.js', import.meta.url)
          );
          workerRef.current.onmessage = (e) => {
            const { type, id } = e.data;
            if (id && id !== aiSearchIdRef.current) return;
            if (type === 'progress') {
              const {
                evaluated,
                total,
                candidate,
                score,
                bestMove,
                bestScore,
                completed,
              } = e.data;
              setAiProgress({
                evaluated,
                total,
                candidate,
                score,
                bestMove,
                bestScore,
                completed,
              });
              return;
            }
            if (type !== 'done') return;
            aiThinkingRef.current = false;
            setIsAiThinking(false);
            setAiProgress(null);
            const { move } = e.data;
            if (!move) return;
            if (gameOverRef.current || playerRef.current !== 'W') return;
            const [r, c] = move;
            if (pausedRef.current || !isPageVisibleRef.current) {
              setPendingAiMove({ r, c, player: 'W' });
              return;
            }
            commitMove(r, c, 'W');
          };
        } catch {
          workerRef.current = null;
        }
      }
    }
    return () => workerRef.current?.terminate();
  }, [commitMove]);

  // draw loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const draw = () => {
      const size = boardSizeRef.current;
      const cellSize = size / SIZE;
      const currentLastMove = lastMoveRef.current;
      const currentHint = hintRef.current;
      const focused = focusedCellRef.current;
      const boardFocused = boardFocusRef.current;
      const analysisProgress = aiProgressRef.current;
      const showAnalysis = aiThinkingRef.current && analysisProgress;
      const now = performance.now();
      ctx.clearRect(0, 0, size, size);

      const boardGradient = ctx.createLinearGradient(0, 0, size, size);
      boardGradient.addColorStop(0, BOARD_THEME.boardStart);
      boardGradient.addColorStop(0.45, BOARD_THEME.boardMid);
      boardGradient.addColorStop(1, BOARD_THEME.boardEnd);
      ctx.fillStyle = boardGradient;
      ctx.fillRect(0, 0, size, size);

      const ambient = ctx.createRadialGradient(
        size * 0.2,
        size * 0.2,
        size * 0.1,
        size * 0.5,
        size * 0.5,
        size * 0.8,
      );
      ambient.addColorStop(0, BOARD_THEME.ambientHighlight);
      ambient.addColorStop(1, BOARD_THEME.ambientShadow);
      ctx.fillStyle = ambient;
      ctx.fillRect(0, 0, size, size);

      ctx.lineWidth = 2;
      for (let i = 0; i <= SIZE; i += 1) {
        const offset = i * cellSize;
        const horizontal = ctx.createLinearGradient(0, offset, size, offset);
        horizontal.addColorStop(0, BOARD_THEME.gridDark);
        horizontal.addColorStop(0.5, BOARD_THEME.gridLight);
        horizontal.addColorStop(1, BOARD_THEME.gridDark);
        ctx.strokeStyle = horizontal;
        ctx.beginPath();
        ctx.moveTo(0, offset);
        ctx.lineTo(size, offset);
        ctx.stroke();

        const vertical = ctx.createLinearGradient(offset, 0, offset, size);
        vertical.addColorStop(0, BOARD_THEME.gridDark);
        vertical.addColorStop(0.5, BOARD_THEME.gridLight);
        vertical.addColorStop(1, BOARD_THEME.gridDark);
        ctx.strokeStyle = vertical;
        ctx.beginPath();
        ctx.moveTo(offset, 0);
        ctx.lineTo(offset, size);
        ctx.stroke();
      }

      ctx.lineWidth = 4;
      const frame = ctx.createLinearGradient(0, 0, size, size);
      frame.addColorStop(0, 'rgba(0,0,0,0.6)');
      frame.addColorStop(0.5, 'rgba(255,255,255,0.2)');
      frame.addColorStop(1, 'rgba(0,0,0,0.6)');
      ctx.strokeStyle = frame;
      ctx.strokeRect(2, 2, size - 4, size - 4);

      if (showAnalysis) {
        const drawAnalysisRing = (move, type) => {
          if (!move) return;
          const [r, c] = move;
          if (
            typeof r !== 'number'
            || typeof c !== 'number'
            || r < 0
            || r >= SIZE
            || c < 0
            || c >= SIZE
          ) return;
          const cx = c * cellSize + cellSize / 2;
          const cy = r * cellSize + cellSize / 2;
          const pulse = 0.92 + Math.sin(now / 180) * 0.08;
          const ringRadius = (cellSize / 2 - 7) * pulse;
          ctx.save();
          if (type === 'best') {
            ctx.strokeStyle = 'rgba(248, 113, 113, 0.95)';
            ctx.lineWidth = 3;
          } else {
            const candidateGlow = ctx.createRadialGradient(
              cx,
              cy,
              ringRadius * 0.25,
              cx,
              cy,
              ringRadius * 1.3,
            );
            candidateGlow.addColorStop(0, 'rgba(56, 189, 248, 0.35)');
            candidateGlow.addColorStop(1, 'rgba(56, 189, 248, 0)');
            ctx.fillStyle = candidateGlow;
            ctx.fillRect(c * cellSize, r * cellSize, cellSize, cellSize);
            ctx.strokeStyle = 'rgba(125, 211, 252, 0.9)';
            ctx.lineWidth = 2;
          }
          ctx.beginPath();
          ctx.arc(cx, cy, ringRadius, 0, Math.PI * 2);
          ctx.stroke();
          ctx.restore();
        };

        drawAnalysisRing(analysisProgress.candidate, 'candidate');
        drawAnalysisRing(analysisProgress.bestMove, 'best');
      }

      const b = boardRef.current;
      const colors = themeRef.current === 'dark'
        ? { B: '#1b263b', W: '#f8fafc' }
        : { B: '#2f3e46', W: '#e0fbfc' };
      const drawDisk = (x, y, color, options = {}) => {
        const { scaleY = 1, tilt = 0, highlight = false } = options;
        ctx.save();
        ctx.translate(x, y);
        ctx.scale(1, scaleY);
        ctx.translate(0, tilt);
        const radius = cellSize / 2 - 6;
        const gradient = ctx.createRadialGradient(0, -radius * 0.4, radius * 0.2, 0, 0, radius);
        gradient.addColorStop(0, highlight ? '#ffffff' : '#f1f5f9');
        gradient.addColorStop(0.4, color);
        gradient.addColorStop(1, '#0f172a');
        ctx.beginPath();
        ctx.shadowColor = 'rgba(0,0,0,0.6)';
        ctx.shadowBlur = 8;
        ctx.shadowOffsetY = 4;
        ctx.arc(0, 0, radius, 0, Math.PI * 2);
        ctx.fillStyle = gradient;
        ctx.fill();
        ctx.lineWidth = 1.6;
        ctx.strokeStyle = themeRef.current === 'dark' ? '#0f172a' : '#1e293b';
        ctx.stroke();
        ctx.restore();
      };
      for (let r = 0; r < SIZE; r += 1) {
        for (let c = 0; c < SIZE; c += 1) {
          const cell = b[r][c];
          const anim = flippingRef.current.find((a) => a.key === `${r}-${c}`);
          const x = c * cellSize + cellSize / 2;
          const y = r * cellSize + cellSize / 2;
          if (currentLastMove && currentLastMove.r === r && currentLastMove.c === c) {
            ctx.save();
            const lastGlow = ctx.createRadialGradient(
              x,
              y,
              cellSize * 0.1,
              x,
              y,
              cellSize * 0.6,
            );
            lastGlow.addColorStop(0, BOARD_THEME.lastMove);
            lastGlow.addColorStop(1, 'rgba(255, 215, 0, 0)');
            ctx.fillStyle = lastGlow;
            ctx.fillRect(
              c * cellSize,
              r * cellSize,
              cellSize,
              cellSize,
            );
            ctx.restore();
          }
          if (anim) {
            const t = (now - anim.start) / anim.duration;
            if (t <= 0) {
              drawDisk(x, y, colors[anim.from]);
            } else if (t >= 1) {
              const idx = flippingRef.current.indexOf(anim);
              if (idx !== -1) flippingRef.current.splice(idx, 1);
              drawDisk(x, y, colors[anim.to]);
            } else {
              const angle = Math.min(Math.max(t, 0), 1) * Math.PI;
              const perspective = Math.max(Math.abs(Math.cos(angle)), 0.08);
              const isSecondHalf = t >= 0.5;
              const tilt = Math.sin(angle) * (cellSize * 0.08);
              drawDisk(
                x,
                y,
                isSecondHalf ? colors[anim.to] : colors[anim.from],
                {
                  scaleY: perspective,
                  tilt,
                  highlight: isSecondHalf,
                },
              );
            }
            continue;
          }
          if (cell) {
            drawDisk(x, y, colors[cell]);
          }
        }
      }
      if (!pausedRef.current && previewRef.current) {
        const { r, c, flips } = previewRef.current;
        const x = c * cellSize + cellSize / 2;
        const y = r * cellSize + cellSize / 2;
        ctx.save();
        ctx.globalAlpha = 0.65;
        drawDisk(x, y, playerRef.current === 'B' ? colors.B : colors.W);
        ctx.restore();
        ctx.strokeStyle = 'rgba(255,255,255,0.8)';
        ctx.lineWidth = 1.5;
        flips.forEach(([fr, fc]) => {
          ctx.beginPath();
          ctx.arc(
            fc * cellSize + cellSize / 2,
            fr * cellSize + cellSize / 2,
            cellSize / 2 - 6,
            0,
            Math.PI * 2,
          );
          ctx.stroke();
        });
      }
      if (!pausedRef.current && playerRef.current === 'B') {
        ctx.save();
        Object.keys(legalRef.current).forEach((key) => {
          const [r, c] = key.split('-').map(Number);
          const cx = c * cellSize + cellSize / 2;
          const cy = r * cellSize + cellSize / 2;
          const gradient = ctx.createRadialGradient(
            cx,
            cy,
            cellSize * 0.1,
            cx,
            cy,
            cellSize * 0.45,
          );
          const isHint = currentHint && currentHint.r === r && currentHint.c === c;
          gradient.addColorStop(0, isHint ? BOARD_THEME.hintCore : BOARD_THEME.legalCore);
          gradient.addColorStop(1, isHint ? BOARD_THEME.hintGlow : BOARD_THEME.legalGlow);
          ctx.fillStyle = gradient;
          ctx.fillRect(c * cellSize, r * cellSize, cellSize, cellSize);
        });
        if (focused && boardFocused) {
          const { r, c } = focused;
          const focusPadding = 3;
          ctx.strokeStyle = 'rgba(255,255,255,0.85)';
          ctx.lineWidth = 2.5;
          ctx.strokeRect(
            c * cellSize + focusPadding,
            r * cellSize + focusPadding,
            cellSize - focusPadding * 2,
            cellSize - focusPadding * 2,
          );
        }
        Object.keys(legalRef.current).forEach((key) => {
          const [r, c] = key.split('-').map(Number);
          if (currentHint && currentHint.r === r && currentHint.c === c) {
            const cx = c * cellSize + cellSize / 2;
            const cy = r * cellSize + cellSize / 2;
            ctx.beginPath();
            ctx.strokeStyle = 'rgba(120, 190, 255, 0.9)';
            ctx.lineWidth = 2;
            ctx.arc(cx, cy, cellSize / 2 - 10, 0, Math.PI * 2);
            ctx.stroke();
          }
        });
        ctx.restore();
      }
    };
    const loop = () => {
      draw();
      animRef.current = requestAnimationFrame(loop);
    };
    animRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animRef.current);
  }, []);

  // handle turn logic and AI
  useEffect(() => {
    clearTimeout(passTimeoutRef.current);
    const resolution = getTurnResolution(board, player);
    const activeMoves = resolution.kind === 'play' ? resolution.legalMoves : {};
    legalRef.current = activeMoves;

    const playerMoves = Object.keys(computeLegalMoves(board, 'B')).length;
    const aiMoves = Object.keys(computeLegalMoves(board, 'W')).length;
    setMobility({ player: playerMoves, ai: aiMoves });

    const cornerKeys = [
      '0-0',
      `0-${SIZE - 1}`,
      `${SIZE - 1}-0`,
      `${SIZE - 1}-${SIZE - 1}`,
    ];
    setTip(
      cornerKeys.some((k) => activeMoves[k])
        ? 'Tip: Corners are powerful—capture them when you can!'
        : 'Tip: Control the corners to gain an advantage.',
    );

    if (resolution.kind === 'gameover') {
      const { score: finalScore, winner } = resolution;
      setIsAiThinking(false);
      aiThinkingRef.current = false;
      setAiProgress(null);
      setGameOver(true);
      setGameResult({ winner, score: finalScore });
      if (winner === 'B') {
        setWins((w) => ({ ...w, player: w.player + 1 }));
        setMessage('You win!');
      } else if (winner === 'W') {
        setWins((w) => ({ ...w, ai: w.ai + 1 }));
        setMessage('AI wins!');
      } else {
        setMessage('Draw!');
      }
      setScore(finalScore);
      return;
    }

    setGameOver(false);
    setGameResult(null);

    if (paused || !isPageVisible) {
      if (paused) {
        setMessage(pendingAiMove ? 'Paused — AI move queued' : 'Paused');
      } else {
        setMessage('Tab inactive — resume to continue');
      }
      return;
    }

    if (pendingAiMove && player === 'W') {
      setMessage('AI move queued');
      return;
    }

    if (resolution.kind === 'pass') {
      setIsAiThinking(false);
      aiThinkingRef.current = false;
      setAiProgress(null);
      setMessage('No legal moves, passing turn');
      setHintMove(null);
      previewRef.current = null;
      passTimeoutRef.current = setTimeout(() => {
        setPlayer(resolution.nextPlayer);
      }, 600);
      return;
    }

    if (player === 'W' && !aiThinkingRef.current) {
      startAiTurn();
    }
    if (player === 'B') {
      setMessage('Your turn');
    } else if (aiThinkingRef.current) {
      setMessage('AI is thinking...');
    } else {
      setMessage("AI's turn");
    }
  }, [board, player, paused, isPageVisible, pendingAiMove, startAiTurn]);

  const tryMove = useCallback((r, c) => {
    if (paused || player !== 'B' || gameOver) return;
    const key = `${r}-${c}`;
    const flips = legalRef.current[key];
    if (!flips) return;
    previewRef.current = null;
    commitMove(r, c, 'B', flips);
  }, [paused, player, gameOver, commitMove]);

  const focusBoard = () => {
    boardWrapperRef.current?.focus();
  };

  const handleClick = (e) => {
    focusBoard();
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const size = boardSizeRef.current;
    const cellSize = size / SIZE;
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const r = Math.floor(y / cellSize);
    const c = Math.floor(x / cellSize);
    if (r < 0 || r >= SIZE || c < 0 || c >= SIZE) return;
    setFocusedCell({ r, c });
    tryMove(r, c);
  };

  const handleMouseMove = (e) => {
    if (pausedRef.current || playerRef.current !== 'B' || gameOver) {
      previewRef.current = null;
      return;
    }
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const size = boardSizeRef.current;
    const cellSize = size / SIZE;
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const r = Math.floor(y / cellSize);
    const c = Math.floor(x / cellSize);
    if (r < 0 || r >= SIZE || c < 0 || c >= SIZE) {
      previewRef.current = null;
      return;
    }
    const key = `${r}-${c}`;
    const flips = legalRef.current[key];
    previewRef.current = flips ? { r, c, flips } : null;
    setFocusedCell({ r, c });
  };

  const handleMouseLeave = () => {
    previewRef.current = null;
  };

  const reset = () => {
    clearTimeout(passTimeoutRef.current);
    const fresh = createBoard();
    setBoard(fresh);
    setPlayer('B');
    setMessage('Your turn');
    setPaused(false);
    setHistory([]);
    setAiProgress(null);
    setIsAiThinking(false);
    aiThinkingRef.current = false;
    aiSearchIdRef.current += 1;
    setHintMove(null);
    setLastMove(null);
    setGameOver(false);
    setGameResult(null);
    setPendingAiMove(null);
    setFocusedCell({ r: 3, c: 3 });
  };

  const handleResetWins = () => {
    if (typeof window !== 'undefined') {
      const confirmed = window.confirm('Reset win counters for this device?');
      if (!confirmed) return;
    }
    setWins({ player: 0, ai: 0 });
  };

  const undo = useCallback(() => {
    if (!history.length) return;
    clearTimeout(passTimeoutRef.current);
    const last = history[history.length - 1];
    const stepCount = last.player === 'W' && history.length >= 2 ? 2 : 1;
    const targetEntry = history[history.length - stepCount];
    const nextHistory = history.slice(0, -stepCount);
    setBoard(targetEntry.board.map((row) => row.slice()));
    setPlayer(targetEntry.player);
    setHistory(nextHistory);
    setMessage(targetEntry.player === 'B' ? 'Your turn' : "AI's turn");
    previewRef.current = null;
    flippingRef.current = [];
    aiThinkingRef.current = false;
    aiSearchIdRef.current += 1;
    setIsAiThinking(false);
    setAiProgress(null);
    const previousMove = nextHistory[nextHistory.length - 1];
    if (previousMove?.move) {
      setLastMove({ r: previousMove.move.r, c: previousMove.move.c, player: previousMove.player });
    } else {
      setLastMove(null);
    }
    setHintMove(null);
    setGameOver(false);
    setGameResult(null);
    setPendingAiMove(null);
    if (targetEntry.move) {
      setFocusedCell({ r: targetEntry.move.r, c: targetEntry.move.c });
    }
  }, [history]);

  useEffect(() => {
    if (!pendingAiMove) return;
    if (player !== 'W' || gameOver) {
      setPendingAiMove(null);
      return;
    }
    if (paused || !isPageVisible) return;
    const { r, c } = pendingAiMove;
    const applied = commitMove(r, c, 'W');
    if (applied) {
      setPendingAiMove(null);
    }
  }, [pendingAiMove, paused, isPageVisible, gameOver, player, commitMove]);

  useEffect(() => {
    setHintMove(null);
  }, [player, board]);

  useEffect(() => {
    if (paused || player !== 'W' || gameOver) {
      setAiProgress(null);
    }
  }, [paused, player, gameOver]);

  const requestHint = useCallback(() => {
    if (player !== 'B' || paused || gameOver) return;
    const { weights } = DIFFICULTIES[difficulty] || DIFFICULTIES.medium;
    const hint = bestMove(boardRef.current, 'B', 3, weights) || null;
    if (hint) {
      const [r, c] = hint;
      const flips = legalRef.current[`${r}-${c}`];
      setHintMove({ r, c, flips: flips || [] });
      setFocusedCell({ r, c });
    } else {
      setHintMove(null);
    }
  }, [difficulty, paused, player, gameOver]);

  const handleKeyDown = (e) => {
    const { key } = e;
    if (key === 'p' || key === 'P') {
      e.preventDefault();
      setPaused((prev) => !prev);
      return;
    }
    if (key === 'r' || key === 'R') {
      e.preventDefault();
      reset();
      return;
    }
    if (key === 'u' || key === 'U' || key === 'Backspace') {
      e.preventDefault();
      undo();
      return;
    }
    if (paused || gameOver) return;
    if (!focusedCell) return;
    const moveFocus = (dr, dc) => {
      e.preventDefault();
      setFocusedCell((prev) => {
        const nextR = (prev.r + dr + SIZE) % SIZE;
        const nextC = (prev.c + dc + SIZE) % SIZE;
        const keyPos = `${nextR}-${nextC}`;
        if (player === 'B' && legalRef.current[keyPos]) {
          previewRef.current = {
            r: nextR,
            c: nextC,
            flips: legalRef.current[keyPos],
          };
        } else {
          previewRef.current = null;
        }
        return { r: nextR, c: nextC };
      });
    };
    if (key === 'ArrowUp') {
      moveFocus(-1, 0);
      return;
    }
    if (key === 'ArrowDown') {
      moveFocus(1, 0);
      return;
    }
    if (key === 'ArrowLeft') {
      moveFocus(0, -1);
      return;
    }
    if (key === 'ArrowRight') {
      moveFocus(0, 1);
      return;
    }
    if (key === 'Enter' || key === ' ') {
      e.preventDefault();
      tryMove(focusedCell.r, focusedCell.c);
      return;
    }
    if (key === 'h' || key === 'H') {
      e.preventDefault();
      requestHint();
    }
  };

  const formatMove = (entry, index) => {
    if (!entry.move) return `Move ${index + 1}`;
    const { r, c } = entry.move;
    const col = String.fromCharCode(65 + c);
    const row = r + 1;
    return `${index + 1}. ${entry.player === 'B' ? 'You' : 'AI'} → ${col}${row}`;
  };

  const cellLabel = (r, c) => `${String.fromCharCode(65 + c)}${r + 1}`;
  const formatScore = (value) => {
    if (typeof value !== 'number' || Number.isNaN(value)) return null;
    const rounded = Math.round(value);
    return rounded >= 0 ? `+${rounded}` : `${rounded}`;
  };

  const totalPieces = score.black + score.white || 1;
  const playerRatio = (score.black / totalPieces) * 100;

  const instructionsId = 'reversi-instructions';

  return (
    <div className="h-full w-full overflow-y-auto bg-ub-cool-grey text-white">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 p-4 md:flex-row">
        <div
          ref={containerRef}
          className="flex flex-1 flex-col items-center gap-3"
        >
          <div
            ref={boardWrapperRef}
            role="application"
            aria-roledescription="Reversi board"
            aria-describedby={instructionsId}
            aria-keyshortcuts="ArrowUp ArrowDown ArrowLeft ArrowRight Enter Space H U Backspace R P"
            tabIndex={0}
            onFocus={() => setIsBoardFocused(true)}
            onBlur={() => setIsBoardFocused(false)}
            onKeyDown={handleKeyDown}
            className="relative rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
          >
            <canvas
              ref={canvasRef}
              width={boardSize}
              height={boardSize}
              onPointerDown={focusBoard}
              onClick={handleClick}
              onMouseMove={handleMouseMove}
              onMouseLeave={handleMouseLeave}
              className="rounded-lg shadow-[0_35px_60px_-15px_rgba(0,0,0,0.45)]"
              aria-label="Reversi board"
            />
            {gameOver && gameResult && (
              <div className="absolute inset-0 flex items-center justify-center rounded-lg bg-slate-950/85 p-4 text-center">
                <div className="w-full max-w-xs space-y-3 rounded-lg border border-slate-700/70 bg-slate-900/90 p-4 shadow-xl">
                  <div className="text-lg font-semibold text-slate-100">
                    {gameResult.winner === 'B'
                      ? 'You win!'
                      : gameResult.winner === 'W'
                        ? 'AI wins!'
                        : 'Draw game'}
                  </div>
                  <div className="text-sm text-slate-300">
                    Final score — You {gameResult.score.black} : AI {gameResult.score.white}
                  </div>
                  <div className="flex flex-col gap-2">
                    <button
                      className="w-full rounded border border-slate-700 bg-slate-900/80 px-3 py-2 text-sm font-semibold uppercase tracking-widest text-slate-100 transition hover:border-sky-400 hover:text-sky-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400"
                      onClick={reset}
                    >
                      Play Again
                    </button>
                    <button
                      className="w-full rounded border border-slate-700 bg-slate-900/80 px-3 py-2 text-xs font-semibold uppercase tracking-widest text-slate-200 transition hover:border-rose-400 hover:text-rose-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-400"
                      onClick={handleResetWins}
                    >
                      Reset Wins
                    </button>
                  </div>
                </div>
              </div>
            )}
            <div className="pointer-events-none absolute inset-x-3 top-3 flex justify-between text-xs font-semibold uppercase tracking-widest text-slate-200/80">
              <span className="flex items-center gap-1">
                <span
                  className={`h-3 w-3 rounded-full ${diskTheme === 'dark' ? 'bg-slate-900' : 'bg-slate-600'}`}
                  aria-hidden="true"
                />
                You {score.black}
              </span>
              <span className="flex items-center gap-1">
                <span
                  className={`h-3 w-3 rounded-full ${diskTheme === 'dark' ? 'bg-slate-100' : 'bg-slate-300'}`}
                  aria-hidden="true"
                />
                AI {score.white}
              </span>
            </div>
            <p id={instructionsId} className="sr-only">
              Use arrow keys to move around the board and press Enter or Space to place a disk. Press H for a hint, U or Backspace to undo, R to reset, or P to pause. Click cells directly to play.
            </p>
          </div>
          <div className="w-full space-y-3 rounded-lg bg-slate-900/60 p-4 shadow-inner">
            <div className="text-sm font-semibold uppercase tracking-widest text-slate-200">
              Score Balance
            </div>
            <div className="h-3 w-full overflow-hidden rounded-full bg-slate-800" aria-hidden="true">
              <div
                className="h-full rounded-full bg-gradient-to-r from-sky-500 via-cyan-400 to-emerald-400 transition-all"
                style={{ width: `${playerRatio}%` }}
              />
            </div>
            <div className="flex justify-between text-xs text-slate-300">
              <span>You • {score.black}</span>
              <span>AI • {score.white}</span>
            </div>
            <div className="text-sm font-semibold uppercase tracking-widest text-slate-200">
              Mobility
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs text-slate-300">
              <div className="rounded border border-slate-700/70 bg-slate-900/80 p-2 text-center">
                <div className="font-semibold text-slate-100">You</div>
                <div className="text-lg font-bold text-sky-300">{mobility.player}</div>
              </div>
              <div className="rounded border border-slate-700/70 bg-slate-900/80 p-2 text-center">
                <div className="font-semibold text-slate-100">AI</div>
                <div className="text-lg font-bold text-rose-300">{mobility.ai}</div>
              </div>
            </div>
          </div>
        </div>
        <div className="flex w-full max-w-md flex-col gap-4 rounded-lg bg-slate-950/70 p-4 text-slate-100 shadow-lg">
          <div className="space-y-2">
            <div className="text-lg font-semibold tracking-wide text-slate-50">Reversi Control Center</div>
            <div className="text-sm" role="status" aria-live="polite">
              {message}
            </div>
            {paused && pendingAiMove && (
              <div className="text-xs text-amber-200" role="status" aria-live="polite">
                AI move queued — resume to apply it.
              </div>
            )}
            {isAiThinking && (
              <div className="space-y-1 text-xs text-slate-300" role="status" aria-live="polite">
                <div className="flex items-center gap-2">
                  <span
                    aria-hidden="true"
                    className="inline-flex h-3 w-3 animate-spin rounded-full border border-slate-400/30 border-t-transparent"
                  />
                  <span>
                    {aiProgress && aiProgress.total
                      ? `AI evaluating moves (${aiProgress.evaluated}/${aiProgress.total})`
                      : 'AI evaluating moves...'}
                  </span>
                </div>
                {aiProgress?.candidate && (
                  <div>
                    Candidate: {cellLabel(aiProgress.candidate[0], aiProgress.candidate[1])}
                    {formatScore(aiProgress.score) ? ` (score: ${formatScore(aiProgress.score)})` : ''}
                  </div>
                )}
                {aiProgress?.bestMove && (
                  <div>
                    Best so far: {cellLabel(aiProgress.bestMove[0], aiProgress.bestMove[1])}
                    {formatScore(aiProgress.bestScore)
                      ? ` (score: ${formatScore(aiProgress.bestScore)})`
                      : ''}
                  </div>
                )}
              </div>
            )}
            <div className="text-xs uppercase tracking-wider text-slate-400">
              {tip}
            </div>
            <div className="flex flex-wrap gap-2 text-xs text-slate-300">
              <span className="rounded border border-slate-700/70 bg-slate-900/60 px-2 py-1 font-semibold uppercase tracking-widest">
                Wins • You {wins.player} / AI {wins.ai}
              </span>
              <span className="rounded border border-slate-700/70 bg-slate-900/60 px-2 py-1 font-semibold uppercase tracking-widest">
                Turn • {player === 'B' ? 'You' : 'AI'}
              </span>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <button
              className="flex items-center justify-center gap-2 rounded border border-slate-700 bg-slate-900/70 px-3 py-2 font-semibold text-slate-100 transition hover:border-sky-400 hover:text-sky-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400"
              onClick={reset}
            >
              <img src="/themes/Yaru/status/chrome_refresh.svg" width="18" height="18" alt="" />
              Reset
            </button>
            <button
              className="flex items-center justify-center gap-2 rounded border border-slate-700 bg-slate-900/70 px-3 py-2 font-semibold text-slate-100 transition hover:border-sky-400 hover:text-sky-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 disabled:cursor-not-allowed disabled:opacity-50"
              onClick={undo}
              disabled={!history.length}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="18" height="18" aria-hidden="true">
                <path d="M9 15L3 9l6-6" />
                <path d="M3 9h11a4 4 0 0 1 0 8h-1" />
              </svg>
              Undo
            </button>
            <button
              className="flex items-center justify-center gap-2 rounded border border-slate-700 bg-slate-900/70 px-3 py-2 font-semibold transition hover:border-emerald-400 hover:text-emerald-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
              onClick={() => setPaused((p) => !p)}
              aria-pressed={paused}
            >
              {paused ? 'Resume' : 'Pause'}
            </button>
            <button
              className="flex items-center justify-center gap-2 rounded border border-slate-700 bg-slate-900/70 px-3 py-2 font-semibold transition hover:border-emerald-400 hover:text-emerald-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
              onClick={() => setSound((s) => !s)}
              aria-pressed={sound}
            >
              {sound ? 'Sound: On' : 'Sound: Off'}
            </button>
            <button
              className="flex items-center justify-center gap-2 rounded border border-slate-700 bg-slate-900/70 px-3 py-2 font-semibold transition hover:border-violet-400 hover:text-violet-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-400"
              onClick={() => setDiskTheme((t) => (t === 'dark' ? 'light' : 'dark'))}
              aria-pressed={diskTheme === 'light'}
            >
              {diskTheme === 'dark' ? 'Theme: Dark' : 'Theme: Light'}
            </button>
            <button
              className="flex items-center justify-center gap-2 rounded border border-slate-700 bg-slate-900/70 px-3 py-2 font-semibold transition hover:border-sky-400 hover:text-sky-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400"
              onClick={requestHint}
              disabled={player !== 'B' || paused || gameOver}
            >
              Hint
            </button>
          </div>
          <button
            className="w-full rounded border border-slate-700 bg-slate-900/70 px-3 py-2 text-xs font-semibold uppercase tracking-widest text-slate-200 transition hover:border-rose-400 hover:text-rose-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-400"
            onClick={handleResetWins}
          >
            Reset Wins
          </button>
          <div className="flex flex-col gap-2 text-sm">
            <label className="text-xs font-semibold uppercase tracking-widest text-slate-300" htmlFor="reversi-difficulty">
              Difficulty
            </label>
            <select
              id="reversi-difficulty"
              className="rounded border border-slate-700 bg-slate-900/70 px-3 py-2 font-semibold text-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400"
              value={difficulty}
              onChange={(e) => setDifficulty(e.target.value)}
            >
              {Object.keys(DIFFICULTIES).map((d) => (
                <option key={d} value={d}>
                  {`Difficulty: ${d.charAt(0).toUpperCase()}${d.slice(1)}`}
                </option>
              ))}
            </select>
            <button
              className="w-full rounded border border-slate-700 bg-slate-900/70 px-3 py-2 text-sm font-semibold uppercase tracking-widest text-slate-100 transition hover:border-amber-400 hover:text-amber-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
              onClick={() => setUseBook((b) => !b)}
              aria-pressed={useBook}
            >
              {useBook ? 'Opening Book: Enabled' : 'Opening Book: Disabled'}
            </button>
          </div>
          <div className="space-y-2">
            <div className="text-xs font-semibold uppercase tracking-widest text-slate-300">
              Move History
            </div>
            <ul className="max-h-40 space-y-1 overflow-y-auto rounded border border-slate-800/80 bg-slate-900/60 p-3 text-xs font-mono text-slate-200">
              {history.length ? (
                history.map((entry, index) => (
                  <li
                    key={`${entry.player}-${index}-${entry.move ? `${entry.move.r}-${entry.move.c}` : 'na'}`}
                  >
                    {formatMove(entry, index)}
                  </li>
                ))
              ) : (
                <li>No moves yet. Claim a corner to start strong!</li>
              )}
            </ul>
            {hintMove && (
              <div className="rounded border border-sky-500/50 bg-sky-500/10 px-3 py-2 text-xs text-sky-200">
                Suggested move: {String.fromCharCode(65 + hintMove.c)}{hintMove.r + 1}. Press Enter or click to place.
              </div>
            )}
          </div>
          <div className="space-y-1 text-xs text-slate-400">
            <div className="font-semibold uppercase tracking-widest text-slate-300">Accessibility & Tips</div>
            <p>
              Color palette is tuned for high contrast and colorblind-friendly play. Navigate with keyboard arrows, use Tab to focus the board, and toggle hints with the H key.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Reversi;
