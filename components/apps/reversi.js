import React, {
  useState,
  useRef,
  useEffect,
  useCallback,
  useMemo,
} from 'react';
import GameLayout from './GameLayout';
import { useGameLoop, useLeaderboard } from './Games/common';
import {
  SIZE,
  DIRECTIONS,
  createBoard,
  computeLegalMoves,
  applyMove,
  countPieces,
  getBookMove,
  getScoreMargin,
} from './reversiLogic';

const DIFFICULTIES = {
  easy: { depth: 2, weights: { mobility: 1, corners: 10, edges: 5 } },
  medium: { depth: 3, weights: { mobility: 3, corners: 20, edges: 7 } },
  hard: { depth: 4, weights: { mobility: 5, corners: 25, edges: 10 } },
};

const BOARD_SIZE = 400;
const CELL = BOARD_SIZE / SIZE;

const Reversi = () => {
  const canvasRef = useRef(null);
  const boardRef = useRef(createBoard());
  const legalRef = useRef({});
  const playerRef = useRef('B');
  const pausedRef = useRef(false);
  const ctxRef = useRef(null);
  const audioRef = useRef(null);
  const workerRef = useRef(null);
  const aiThinkingRef = useRef(false);
  const reduceMotionRef = useRef(false);
  const flippingRef = useRef([]);
  const previewRef = useRef(null);
  const gameOverRef = useRef(false);

  const [board, setBoard] = useState(() => createBoard());
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
  const [pieceCount, setPieceCount] = useState(() => countPieces(board));
  const [diskTheme, setDiskTheme] = useState('dark');
  const [aiProgress, setAiProgress] = useState(null);
  const [isAiThinking, setIsAiThinking] = useState(false);
  const themeRef = useRef('dark');
  const { scores, addScore } = useLeaderboard('reversi', 5);
  const bookEnabled = useMemo(() => useBook, [useBook]);
  const scoreMargin = pieceCount.black - pieceCount.white;
  const highScore = scores.length ? scores[0].score : null;
  const difficultyLabel = useMemo(
    () => `${difficulty.charAt(0).toUpperCase()}${difficulty.slice(1)}`,
    [difficulty],
  );

  // keep refs in sync
  useEffect(() => { boardRef.current = board; }, [board]);
  useEffect(() => { playerRef.current = player; }, [player]);
  useEffect(() => { pausedRef.current = paused; }, [paused]);
  useEffect(() => { themeRef.current = diskTheme; }, [diskTheme]);
  useEffect(() => { setPieceCount(countPieces(board)); }, [board]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      reduceMotionRef.current = window.matchMedia(
        '(prefers-reduced-motion: reduce)'
      ).matches;
      if (typeof Worker === 'function') {
        workerRef.current = new Worker(
          new URL('../../workers/reversi.worker.js', import.meta.url)
        );
        workerRef.current.onmessage = (e) => {
          const { type } = e.data;
          if (type === 'progress') {
            const { evaluated, total } = e.data;
            setAiProgress({ evaluated, total });
            return;
          }
          if (type !== 'done') return;
          aiThinkingRef.current = false;
          setIsAiThinking(false);
          setAiProgress(null);
          const { move } = e.data;
          if (!move) return;
          const [r, c] = move;
          const moves = computeLegalMoves(boardRef.current, 'W');
          const key = `${r}-${c}`;
          const flips = moves[key];
          if (!flips) return;
          const prev = boardRef.current.map((row) => row.slice());
          const next = applyMove(prev, r, c, 'W', flips);
          queueFlips(r, c, 'W', prev);
          setHistory((h) => [...h, { board: prev, player: 'W' }]);
          setBoard(next);
          playSound();
          setPlayer('B');
        };
      }
    }
    return () => workerRef.current?.terminate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // load wins from storage
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const saved = window.localStorage.getItem('reversiWins');
    if (saved) {
      try { setWins(JSON.parse(saved)); } catch { /* ignore */ }
    }
  }, []);

  // persist wins
  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem('reversiWins', JSON.stringify(wins));
  }, [wins]);

  const playSound = useCallback(() => {
    if (!sound) return;
    const ctx =
      audioRef.current || new (window.AudioContext || window.webkitAudioContext)();
    audioRef.current = ctx;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.value = 500;
    osc.start();
    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1);
    osc.stop(ctx.currentTime + 0.1);
  }, [sound]);

  const queueFlips = (r, c, player, prevBoard) => {
    if (reduceMotionRef.current) return;
    const start = typeof performance !== 'undefined' ? performance.now() : Date.now();
    DIRECTIONS.forEach(([dr, dc]) => {
      const seq = [];
      let i = r + dr;
      let j = c + dc;
      while (
        i >= 0 && i < SIZE && j >= 0 && j < SIZE &&
        prevBoard[i][j] && prevBoard[i][j] !== player
      ) {
        seq.push([i, j]);
        i += dr;
        j += dc;
      }
      seq.forEach(([sr, sc], idx) => {
        flippingRef.current.push({
          key: `${sr}-${sc}`,
          from: prevBoard[sr][sc],
          to: player,
          start: start + idx * 80,
          duration: 300,
        });
      });
    });
  };

  const drawFrame = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = ctxRef.current || canvas.getContext('2d');
    if (!ctx) return;
    ctxRef.current = ctx;
    ctx.clearRect(0, 0, BOARD_SIZE, BOARD_SIZE);
    ctx.fillStyle = '#0a7e07';
    ctx.fillRect(0, 0, BOARD_SIZE, BOARD_SIZE);
    ctx.strokeStyle = '#000';
    for (let i = 0; i <= SIZE; i += 1) {
      ctx.beginPath();
      ctx.moveTo(0, i * CELL);
      ctx.lineTo(BOARD_SIZE, i * CELL);
      ctx.moveTo(i * CELL, 0);
      ctx.lineTo(i * CELL, BOARD_SIZE);
      ctx.stroke();
    }
    const boardState = boardRef.current;
    const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
    const colors =
      themeRef.current === 'dark'
        ? { B: '#000', W: '#fff' }
        : { B: '#333', W: '#ddd' };
    const drawDisk = (x, y, color, scaleY = 1) => {
      ctx.save();
      ctx.translate(x, y);
      ctx.scale(1, scaleY);
      ctx.beginPath();
      ctx.shadowColor = 'rgba(0,0,0,0.5)';
      ctx.shadowBlur = 4;
      ctx.shadowOffsetY = 2;
      ctx.arc(0, 0, CELL / 2 - 4, 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.fill();
      ctx.restore();
    };
    for (let r = 0; r < SIZE; r += 1) {
      for (let c = 0; c < SIZE; c += 1) {
        const cell = boardState[r][c];
        const anim = flippingRef.current.find((a) => a.key === `${r}-${c}`);
        const x = c * CELL + CELL / 2;
        const y = r * CELL + CELL / 2;
        if (anim) {
          const t = (now - anim.start) / anim.duration;
          if (t <= 0) {
            drawDisk(x, y, colors[anim.from]);
          } else if (t >= 1) {
            const idx = flippingRef.current.indexOf(anim);
            if (idx !== -1) flippingRef.current.splice(idx, 1);
            drawDisk(x, y, colors[anim.to]);
          } else {
            const scale = Math.abs(1 - 2 * t);
            drawDisk(x, y, t < 0.5 ? colors[anim.from] : colors[anim.to], scale);
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
      const x = c * CELL + CELL / 2;
      const y = r * CELL + CELL / 2;
      ctx.save();
      ctx.globalAlpha = 0.5;
      drawDisk(x, y, playerRef.current === 'B' ? colors.B : colors.W);
      ctx.restore();
      ctx.strokeStyle = '#ffff00';
      ctx.lineWidth = 2;
      flips.forEach(([fr, fc]) => {
        ctx.beginPath();
        ctx.arc(fc * CELL + CELL / 2, fr * CELL + CELL / 2, CELL / 2 - 4, 0, Math.PI * 2);
        ctx.stroke();
      });
    }
    if (!pausedRef.current) {
      ctx.save();
      ctx.globalAlpha = 0.4;
      ctx.fillStyle = playerRef.current === 'B' ? colors.B : colors.W;
      Object.keys(legalRef.current).forEach((key) => {
        const [r, c] = key.split('-').map(Number);
        ctx.beginPath();
        ctx.arc(c * CELL + CELL / 2, r * CELL + CELL / 2, 4, 0, Math.PI * 2);
        ctx.fill();
      });
      ctx.restore();
    }
  }, []);

  useGameLoop(drawFrame);

  useEffect(() => {
    drawFrame();
  }, [drawFrame]);

  // handle turn logic and AI
  useEffect(() => {
    const moves = computeLegalMoves(board, player);
    legalRef.current = moves;
    const moveKeys = Object.keys(moves);
    const hasMoves = moveKeys.length > 0;
    if (hasMoves) {
      gameOverRef.current = false;
    }

    const playerMoves = Object.keys(computeLegalMoves(board, 'B')).length;
    const aiMoves = Object.keys(computeLegalMoves(board, 'W')).length;
    setMobility({ player: playerMoves, ai: aiMoves });

    const cornerKeys = [
      '0-0',
      `0-${SIZE - 1}`,
      `${SIZE - 1}-0`,
      `${SIZE - 1}-${SIZE - 1}`,
    ];
    if (cornerKeys.some((k) => moves[k])) {
      setTip('Tip: Corners are powerful—capture them when you can!');
    } else if (playerMoves > aiMoves) {
      setTip('Tip: Keep pressure—your mobility is higher this turn.');
    } else if (aiMoves > playerMoves) {
      setTip('Tip: Limit AI mobility with safe edges and stable discs.');
    } else {
      setTip('Tip: Control the corners to gain an advantage.');
    }
    if (!hasMoves) {
      setIsAiThinking(false);
      setAiProgress(null);
      const opp = player === 'B' ? 'W' : 'B';
      const oppMoves = computeLegalMoves(board, opp);
      if (Object.keys(oppMoves).length === 0) {
        if (!gameOverRef.current) {
          gameOverRef.current = true;
          const margin = getScoreMargin(board);
          if (margin > 0) {
            setWins((w) => ({ ...w, player: w.player + 1 }));
            setMessage(`You win! +${margin}`);
            addScore(`You (${difficultyLabel})`, margin);
          } else if (margin < 0) {
            const aiMargin = Math.abs(margin);
            setWins((w) => ({ ...w, ai: w.ai + 1 }));
            setMessage(`AI wins! +${aiMargin}`);
          } else {
            setMessage('Draw!');
          }
        }
      } else {
        setPlayer(opp); // pass turn
      }
      return;
    }
    if (player === 'W' && !paused && !aiThinkingRef.current) {
      const bookMove = bookEnabled ? getBookMove(board, 'W') : null;
      if (bookMove) {
        const [r, c] = bookMove;
        const flips = moves[`${r}-${c}`];
        if (flips) {
          const prev = boardRef.current.map((row) => row.slice());
          const next = applyMove(prev, r, c, 'W', flips);
          queueFlips(r, c, 'W', prev);
          setHistory((h) => [...h, { board: prev, player: 'W' }]);
          setBoard(next);
          playSound();
          setPlayer('B');
        }
      } else {
        aiThinkingRef.current = true;
        setIsAiThinking(true);
        setAiProgress(null);
        if (workerRef.current) {
          const { depth, weights } = DIFFICULTIES[difficulty];
          workerRef.current.postMessage({ board, player: 'W', depth, weights });
        }
      }
    }
    if (player === 'B') {
      setMessage('Your turn');
    } else if (aiThinkingRef.current) {
      setMessage('AI is thinking...');
    } else {
      setMessage("AI's turn");
    }
  }, [board, player, paused, difficulty, playSound, bookEnabled]);

  const handleClick = (e) => {
    if (paused || player !== 'B') return;
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const r = Math.floor(y / CELL);
    const c = Math.floor(x / CELL);
    const key = `${r}-${c}`;
    const flips = legalRef.current[key];
    if (!flips) return;
    previewRef.current = null;
    const prev = boardRef.current.map((row) => row.slice());
    const next = applyMove(prev, r, c, 'B', flips);
    queueFlips(r, c, 'B', prev);
    setHistory((h) => [...h, { board: prev, player: 'B' }]);
    setBoard(next);
    playSound();
    setPlayer('W');
  };

  const handleMouseMove = (e) => {
    if (pausedRef.current || playerRef.current !== 'B') {
      previewRef.current = null;
      return;
    }
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const r = Math.floor(y / CELL);
    const c = Math.floor(x / CELL);
    const key = `${r}-${c}`;
    const flips = legalRef.current[key];
    previewRef.current = flips ? { r, c, flips } : null;
  };

  const handleMouseLeave = () => {
    previewRef.current = null;
  };

  const reset = () => {
    const fresh = createBoard();
    setBoard(fresh);
    setPlayer('B');
    setMessage('Your turn');
    setPaused(false);
    setHistory([]);
    setAiProgress(null);
    setIsAiThinking(false);
    aiThinkingRef.current = false;
    gameOverRef.current = false;
  };

  const undo = useCallback(() => {
    if (!history.length) return;
    const last = history[history.length - 1];
    setBoard(last.board.map((row) => row.slice()));
    setPlayer(last.player);
    setHistory((h) => h.slice(0, -1));
    setMessage(last.player === 'B' ? 'Your turn' : "AI's turn");
    previewRef.current = null;
    flippingRef.current = [];
    aiThinkingRef.current = false;
    setIsAiThinking(false);
    setAiProgress(null);
    gameOverRef.current = false;
  }, [history]);

  useEffect(() => {
    const handler = (e) => {
      if (e.key === 'u' || e.key === 'U' || e.key === 'Backspace') {
        e.preventDefault();
        undo();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [undo]);

  return (
    <GameLayout
      gameId="reversi"
      score={scoreMargin}
      highScore={highScore ?? undefined}
    >
      <div className="h-full w-full flex flex-col items-center justify-center bg-ub-cool-grey text-white select-none p-3 md:p-4">
        <div className="relative">
          <canvas
            ref={canvasRef}
            width={BOARD_SIZE}
            height={BOARD_SIZE}
            onClick={handleClick}
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
            className="bg-green-700"
            aria-label="Reversi board"
          />
          <div className="absolute top-1 left-1 flex items-center space-x-1 text-sm">
            <div
              className={`w-4 h-4 rounded-full ${diskTheme === 'dark' ? 'bg-black' : 'bg-gray-700'} shadow`}
            />
            <span>{pieceCount.black}</span>
          </div>
          <div className="absolute top-1 right-1 flex items-center space-x-1 text-sm">
            <div
              className={`w-4 h-4 rounded-full ${diskTheme === 'dark' ? 'bg-white' : 'bg-gray-200'} shadow`}
            />
            <span>{pieceCount.white}</span>
          </div>
        </div>
        <div className="mt-3 w-full max-w-xl grid gap-3 md:grid-cols-2">
          <div className="bg-black/20 border border-white/10 rounded p-3 space-y-2">
            <div>Wins – You: {wins.player} | AI: {wins.ai}</div>
            <div>Mobility – You: {mobility.player} | AI: {mobility.ai}</div>
            <div>
              Margin – {scoreMargin > 0 ? `+${scoreMargin}` : scoreMargin}
            </div>
            <div className="text-sm" role="status" aria-live="polite">
              {message}
            </div>
            {isAiThinking && (
              <div
                className="flex items-center text-sm text-gray-300"
                role="status"
                aria-live="polite"
              >
                <span
                  aria-hidden="true"
                  className="mr-2 inline-flex h-3 w-3 animate-spin rounded-full border border-white/30 border-t-transparent"
                />
                <span>
                  {aiProgress && aiProgress.total
                    ? `AI evaluating moves (${aiProgress.evaluated}/${aiProgress.total})`
                    : 'AI evaluating moves...'}
                </span>
              </div>
            )}
            <div className="text-sm text-gray-300">{tip}</div>
            <div className="text-xs text-gray-400 space-y-1">
              <div className="font-semibold uppercase tracking-wide text-gray-200">
                Strategy aids
              </div>
              <ul className="list-disc list-inside space-y-1">
                <li>Hover previews all flips before placing a disc.</li>
                <li>Mobility tracker compares legal moves every turn.</li>
                <li>Leaderboard saves your best margins per difficulty.</li>
              </ul>
            </div>
          </div>
          <div className="bg-black/20 border border-white/10 rounded p-3 space-y-2">
            <div className="font-semibold uppercase tracking-wide text-xs text-gray-200">
              Top margins
            </div>
            {scores.length ? (
              <ol className="space-y-1 text-sm">
                {scores.map((entry, idx) => (
                  <li
                    key={`${entry.name}-${entry.date}`}
                    className="flex items-center justify-between"
                  >
                    <span>
                      {idx + 1}. {entry.name}
                    </span>
                    <span className="text-green-300">+{entry.score}</span>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="text-sm text-gray-300">
                Win a match to record your best margin.
              </p>
            )}
          </div>
        </div>
        <div className="mt-3 flex flex-wrap gap-2 items-center justify-center">
          <button
            className="w-10 h-10 bg-gray-700 hover:bg-gray-600 rounded flex items-center justify-center"
            onClick={reset}
            aria-label="Reset"
          >
            <img src="/themes/Yaru/status/chrome_refresh.svg" width="24" height="24" alt="" />
          </button>
          <button
            className="w-10 h-10 bg-gray-700 hover:bg-gray-600 rounded flex items-center justify-center disabled:opacity-50"
            onClick={undo}
            disabled={!history.length}
            aria-label="Undo"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="white"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              width="24"
              height="24"
            >
              <path d="M9 15L3 9l6-6" />
              <path d="M3 9h11a4 4 0 0 1 0 8h-1" />
            </svg>
          </button>
          <button
            className="px-3 py-1 bg-gray-700 hover:bg-gray-600 rounded"
            onClick={() => setPaused((p) => !p)}
          >
            {paused ? 'Resume' : 'Pause'}
          </button>
          <button
            className="px-3 py-1 bg-gray-700 hover:bg-gray-600 rounded"
            onClick={() => setSound((s) => !s)}
          >
            {sound ? 'Sound: On' : 'Sound: Off'}
          </button>
          <button
            className="px-3 py-1 bg-gray-700 hover:bg-gray-600 rounded"
            onClick={() => setDiskTheme((t) => (t === 'dark' ? 'light' : 'dark'))}
          >
            {diskTheme === 'dark' ? 'Theme: Dark' : 'Theme: Light'}
          </button>
          <select
            className="px-3 py-1 bg-gray-700 hover:bg-gray-600 rounded"
            value={difficulty}
            onChange={(e) => setDifficulty(e.target.value)}
            aria-label="Select difficulty"
          >
            {Object.keys(DIFFICULTIES).map((d) => (
              <option key={d} value={d}>
                {`Difficulty: ${d.charAt(0).toUpperCase()}${d.slice(1)}`}
              </option>
            ))}
          </select>
          <button
            className="px-3 py-1 bg-gray-700 hover:bg-gray-600 rounded"
            onClick={() => setUseBook((b) => !b)}
          >
            {useBook ? 'Book: On' : 'Book: Off'}
          </button>
        </div>
      </div>
    </GameLayout>
  );
};

export default Reversi;
