import React, { useState, useEffect, useRef } from 'react';
import ReactGA from 'react-ga4';
import confetti from 'canvas-confetti';
import GameLayout from './GameLayout';

const winningLines = [
  [0, 1, 2],
  [3, 4, 5],
  [6, 7, 8],
  [0, 3, 6],
  [1, 4, 7],
  [2, 5, 8],
  [0, 4, 8],
  [2, 4, 6],
];

const checkWinner = (board) => {
  for (const [a, b, c] of winningLines) {
    if (board[a] && board[a] === board[b] && board[a] === board[c]) {
      return { winner: board[a], line: [a, b, c] };
    }
  }
  if (board.every(Boolean)) return { winner: 'draw', line: [] };
  return { winner: null, line: [] };
};

const minimax = (board, player, depth = 0, maxDepth = Infinity) => {
  const { winner } = checkWinner(board);
  if (winner === 'O') return { score: 10 - depth };
  if (winner === 'X') return { score: depth - 10 };
  if (winner === 'draw' || depth === maxDepth) return { score: 0 };

  const moves = [];
  board.forEach((cell, idx) => {
    if (!cell) {
      const newBoard = board.slice();
      newBoard[idx] = player;
      const result = minimax(newBoard, player === 'O' ? 'X' : 'O', depth + 1, maxDepth);
      moves.push({ index: idx, score: result.score });
    }
  });
  if (player === 'O') {
    return moves.reduce((best, move) => (move.score > best.score ? move : best), { score: -Infinity });
  }
  return moves.reduce((best, move) => (move.score < best.score ? move : best), { score: Infinity });
};

const getMediumMove = (board, ai) => {
  const opponent = ai === 'X' ? 'O' : 'X';
  const available = board.map((v, i) => (v ? null : i)).filter((v) => v !== null);
  // Win if possible
  for (const idx of available) {
    const test = board.slice();
    test[idx] = ai;
    if (checkWinner(test).winner === ai) return idx;
  }
  // Block opponent win
  for (const idx of available) {
    const test = board.slice();
    test[idx] = opponent;
    if (checkWinner(test).winner === opponent) return idx;
  }
  // Otherwise random
  return available[Math.floor(Math.random() * available.length)];
};

const TicTacToe = () => {
  const [board, setBoard] = useState(Array(9).fill(null));
  const [status, setStatus] = useState('Choose X or O');
  const [player, setPlayer] = useState(null);
  const [ai, setAi] = useState(null);
  const [difficulty, setDifficulty] = useState('hard');
  const [aiMoves, setAiMoves] = useState(0);
  const [winningLine, setWinningLine] = useState([]);
  const [lastMove, setLastMove] = useState(null);
  const [score, setScore] = useState({ player: 0, ai: 0, draw: 0 });
  const [paused, setPaused] = useState(false);
  const [sound, setSound] = useState(true);
  const [hints, setHints] = useState([]);
  const [highScore, setHighScore] = useState(0);
  const [theme, setTheme] = useState('classic');
  const [seriesLength, setSeriesLength] = useState(3);

  const canvasRef = useRef(null);
  const boardRef = useRef(board);
  const winningLineRef = useRef(winningLine);
  const lastMoveRef = useRef(lastMove);
  const hintsRef = useRef(hints);
  const strikeProgressRef = useRef(1);
  const strikeStartRef = useRef(0);
  const themeRef = useRef(theme);

  const startGame = (p) => {
    const a = p === 'X' ? 'O' : 'X';
    setPlayer(p);
    setAi(a);
    setStatus(p === 'X' ? 'Your turn' : "AI's turn");
    ReactGA.event({ category: 'TicTacToe', action: 'start' });
    setBoard(Array(9).fill(null));
    setAiMoves(0);
    setWinningLine([]);
    setLastMove(null);
    setScore({ player: 0, ai: 0, draw: 0 });
    setPaused(false);
    strikeProgressRef.current = 1;
  };

  const handleClick = (idx) => {
    if (player === null || paused) return;
    if (board[idx] || checkWinner(board).winner) return;
    const filled = board.filter(Boolean).length;
    const isXTurn = filled % 2 === 0;
    const currentTurn = isXTurn ? 'X' : 'O';
    if (currentTurn !== player) return;
    const newBoard = board.slice();
    newBoard[idx] = player;
    setBoard(newBoard);
    setLastMove(idx);
    ReactGA.event({ category: 'TicTacToe', action: 'move', label: 'player' });
    if (sound) {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.value = 440;
      osc.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.1);
    }
  };

  useEffect(() => {
    if (player === null || ai === null || paused) return;
    const { winner, line } = checkWinner(board);
    if (winner) {
      const reduceMotion =
        typeof window !== 'undefined' &&
        window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      if (winner !== 'draw') {
        setWinningLine(line);
        strikeStartRef.current =
          typeof performance !== 'undefined' ? performance.now() : 0;
        strikeProgressRef.current = reduceMotion ? 1 : 0;
        if (!reduceMotion) {
          confetti({ particleCount: 75, spread: 60, origin: { y: 0.6 } });
        }
      }
      const winsNeeded = Math.ceil(seriesLength / 2);
      setScore((s) => {
        const newScore = {
          player: s.player + (winner === player ? 1 : 0),
          ai: s.ai + (winner === ai ? 1 : 0),
          draw: s.draw + (winner === 'draw' ? 1 : 0),
        };
        if (
          winner !== 'draw' &&
          (newScore.player >= winsNeeded || newScore.ai >= winsNeeded)
        ) {
          setPaused(true);
          setStatus(
            newScore.player > newScore.ai
              ? 'Series won!'
              : 'Series lost!'
          );
        } else {
          setStatus(
            winner === 'draw'
              ? "It's a draw"
              : winner === player
              ? 'You win!'
              : 'You lose!'
          );
        }
        return newScore;
      });
      ReactGA.event({ category: 'TicTacToe', action: 'game_over', label: winner });
      return;
    }

    const filled = board.filter(Boolean).length;
    const isXTurn = filled % 2 === 0;
    const aiTurn = (ai === 'X' && isXTurn) || (ai === 'O' && !isXTurn);
    if (aiTurn) {
      const available = board.map((v, i) => (v ? null : i)).filter((v) => v !== null);
      let index;
      if (difficulty === 'easy') {
        index = available[Math.floor(Math.random() * available.length)];
      } else if (difficulty === 'medium') {
        index = getMediumMove(board, ai);
      } else if (aiMoves === 0) {
        index = available[Math.floor(Math.random() * available.length)];
      } else {
        index = minimax(board, ai).index;
      }
      if (index !== undefined) {
        const newBoard = board.slice();
        newBoard[index] = ai;
        setTimeout(() => {
          setBoard(newBoard);
          setLastMove(index);
          if (sound) {
            const ctx = new (window.AudioContext || window.webkitAudioContext)();
            const osc = ctx.createOscillator();
            osc.type = 'sine';
            osc.frequency.value = 660;
            osc.connect(ctx.destination);
            osc.start();
            osc.stop(ctx.currentTime + 0.1);
          }
        }, 200);
        setAiMoves((m) => m + 1);
        ReactGA.event({ category: 'TicTacToe', action: 'move', label: 'ai' });
      }
    } else {
      setStatus('Your turn');
    }
  }, [board, player, ai, difficulty, aiMoves, paused, sound]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const size = canvas.width;
    const cellSize = size / 3;
    let frame;
    const draw = () => {
      const b = boardRef.current;
      const w = winningLineRef.current;
      const l = lastMoveRef.current;
      const h = hintsRef.current;
      const t = themeRef.current;
      ctx.clearRect(0, 0, size, size);
      if (w.length) {
        ctx.fillStyle = 'rgba(0,255,0,0.3)';
        w.forEach((idx) => {
          const r = Math.floor(idx / 3);
          const c = idx % 3;
          ctx.fillRect(c * cellSize, r * cellSize, cellSize, cellSize);
        });
        let p = strikeProgressRef.current;
        if (p < 1) {
          const now =
            typeof performance !== 'undefined' ? performance.now() : 0;
          p = Math.min((now - strikeStartRef.current) / 400, 1);
          strikeProgressRef.current = p;
        }
        const startIdx = w[0];
        const endIdx = w[2];
        const startR = Math.floor(startIdx / 3);
        const startC = startIdx % 3;
        const endR = Math.floor(endIdx / 3);
        const endC = endIdx % 3;
        const startX = startC * cellSize + cellSize / 2;
        const startY = startR * cellSize + cellSize / 2;
        const endX = endC * cellSize + cellSize / 2;
        const endY = endR * cellSize + cellSize / 2;
        ctx.strokeStyle = '#00ff00';
        ctx.lineWidth = 6;
        ctx.lineCap = 'round';
        const rand = (n) => {
          const x = Math.sin(n * 999) * 10000;
          return x - Math.floor(x);
        };
        const drawHandLine = () => {
          const steps = 20;
          ctx.beginPath();
          ctx.moveTo(startX, startY);
          for (let i = 1; i <= steps * p; i++) {
            const tStep = i / steps;
            const jitter = 1.5;
            const x = startX + (endX - startX) * tStep + (rand(i) * 2 - 1) * jitter;
            const y = startY + (endY - startY) * tStep + (rand(i + steps) * 2 - 1) * jitter;
            ctx.lineTo(x, y);
          }
          ctx.stroke();
        };
        drawHandLine();
      } else if (l !== null) {
        ctx.fillStyle = 'rgba(0,0,255,0.3)';
        const r = Math.floor(l / 3);
        const c = l % 3;
        ctx.fillRect(c * cellSize, r * cellSize, cellSize, cellSize);
      }
      if (h.length) {
        ctx.fillStyle = 'rgba(255,255,0,0.3)';
        h.forEach((idx) => {
          const r = Math.floor(idx / 3);
          const c = idx % 3;
          ctx.fillRect(c * cellSize, r * cellSize, cellSize, cellSize);
        });
      }
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      for (let i = 1; i < 3; i++) {
        ctx.beginPath();
        ctx.moveTo(i * cellSize, 0);
        ctx.lineTo(i * cellSize, size);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(0, i * cellSize);
        ctx.lineTo(size, i * cellSize);
        ctx.stroke();
      }
      b.forEach((cell, idx) => {
        if (cell) {
          const r = Math.floor(idx / 3);
          const c = idx % 3;
          const x = c * cellSize + cellSize / 2;
          const y = r * cellSize + cellSize / 2;
          if (t === 'emoji') {
            ctx.font = `${cellSize * 0.8}px sans-serif`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillStyle = '#ffffff';
            ctx.fillText(cell, x, y + 2);
          } else {
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 4;
            if (cell === 'X') {
              ctx.beginPath();
              ctx.moveTo(x - cellSize / 3, y - cellSize / 3);
              ctx.lineTo(x + cellSize / 3, y + cellSize / 3);
              ctx.moveTo(x + cellSize / 3, y - cellSize / 3);
              ctx.lineTo(x - cellSize / 3, y + cellSize / 3);
              ctx.stroke();
            } else {
              ctx.beginPath();
              ctx.arc(x, y, cellSize / 3, 0, Math.PI * 2);
              ctx.stroke();
            }
          }
        }
      });
      frame = requestAnimationFrame(draw);
    };
    draw();
    return () => cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    boardRef.current = board;
  }, [board]);
  useEffect(() => {
    winningLineRef.current = winningLine;
  }, [winningLine]);
  useEffect(() => {
    lastMoveRef.current = lastMove;
  }, [lastMove]);
  useEffect(() => {
    hintsRef.current = hints;
  }, [hints]);
  useEffect(() => {
    themeRef.current = theme;
  }, [theme]);
  useEffect(() => {
    setScore({ player: 0, ai: 0, draw: 0 });
  }, [seriesLength]);

  useEffect(() => {
    if (score.player > highScore) {
      setHighScore(score.player);
      if (typeof window !== 'undefined') {
        localStorage.setItem('tictactoeHighScore', String(score.player));
      }
    }
  }, [score.player, highScore]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const stored = parseInt(localStorage.getItem('tictactoeHighScore') || '0', 10);
      setHighScore(stored);
    }
  }, []);

  useEffect(() => {
    if (!player || paused) {
      setHints([]);
      return;
    }
    const { winner } = checkWinner(board);
    if (winner) {
      setHints([]);
      return;
    }
    const filled = board.filter(Boolean).length;
    const isXTurn = filled % 2 === 0;
    const currentTurn = isXTurn ? 'X' : 'O';
    if (currentTurn !== player) {
      setHints([]);
      return;
    }
    const available = board.map((v, i) => (v ? null : i)).filter((v) => v !== null);
    const moves = available.map((idx) => {
      const newBoard = board.slice();
      newBoard[idx] = player;
      const score = minimax(newBoard, player === 'X' ? 'O' : 'X');
      return { idx, score: score.score };
    });
    const best = Math.max(...moves.map((m) => m.score));
    setHints(moves.filter((m) => m.score === best).map((m) => m.idx));
  }, [board, player, paused]);

  const restart = () => {
    setBoard(Array(9).fill(null));
    setAiMoves(0);
    setWinningLine([]);
    setLastMove(null);
    setStatus(player === 'X' ? 'Your turn' : "AI's turn");
    setPaused(false);
    strikeProgressRef.current = 1;
  };

  const reset = () => {
    setBoard(Array(9).fill(null));
    setStatus('Choose X or O');
    setPlayer(null);
    setAi(null);
    setAiMoves(0);
    setWinningLine([]);
    setLastMove(null);
    setScore({ player: 0, ai: 0, draw: 0 });
    setPaused(false);
    strikeProgressRef.current = 1;
  };

  const toggleStartPlayer = () => {
    if (player === null) return;
    const newPlayer = player === 'X' ? 'O' : 'X';
    const newAi = newPlayer === 'X' ? 'O' : 'X';
    setPlayer(newPlayer);
    setAi(newAi);
    setBoard(Array(9).fill(null));
    setAiMoves(0);
    setWinningLine([]);
    setLastMove(null);
    setStatus(newPlayer === 'X' ? 'Your turn' : "AI's turn");
    setPaused(false);
    strikeProgressRef.current = 1;
  };

  const difficultySlider = (
    <div className="w-56 mb-4">
      <input
        type="range"
        min="0"
        max="2"
        value={[ 'easy', 'medium', 'hard' ].indexOf(difficulty)}
        onChange={(e) => setDifficulty(['easy','medium','hard'][parseInt(e.target.value,10)] )}
        className="w-full"
      />
      <div className="flex justify-between text-xs">
        <span>Easy</span>
        <span>Medium</span>
        <span>Hard</span>
      </div>
    </div>
  );

  const themeSelector = (
    <div className="mb-4">
      <label className="mr-2">Theme:</label>
      <select
        value={theme}
        onChange={(e) => setTheme(e.target.value)}
        className="bg-gray-700 rounded p-1"
      >
        <option value="classic">Classic</option>
        <option value="emoji">Emoji</option>
      </select>
    </div>
  );

  const seriesSelector = (
    <div className="mb-4">
      <label className="mr-2">Series:</label>
      <select
        value={seriesLength}
        onChange={(e) => setSeriesLength(parseInt(e.target.value, 10))}
        className="bg-gray-700 rounded p-1"
      >
        <option value={3}>Best of 3</option>
        <option value={5}>Best of 5</option>
      </select>
    </div>
  );

  const handleCanvasClick = (e) => {
    if (player === null || paused) return;
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const col = Math.floor((x / rect.width) * 3);
    const row = Math.floor((y / rect.height) * 3);
    const idx = row * 3 + col;
    handleClick(idx);
  };

  if (player === null) {
    return (
      <div className="h-full w-full flex flex-col items-center justify-center bg-ub-cool-grey text-white p-4">
        {difficultySlider}
        {themeSelector}
        {seriesSelector}
        <div className="mb-4">Choose X or O</div>
        <div className="flex space-x-4">
          <button
            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded"
            onClick={() => startGame('X')}
            onTouchStart={() => startGame('X')}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                startGame('X');
              }
            }}
          >
            X
          </button>
          <button
            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded"
            onClick={() => startGame('O')}
            onTouchStart={() => startGame('O')}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                startGame('O');
              }
            }}
          >
            O
          </button>
        </div>
      </div>

    );
  }

  return (
    <div className="h-full w-full flex flex-col items-center justify-center bg-ub-cool-grey text-white p-4">
      {difficultySlider}
      {themeSelector}
      {seriesSelector}
      <canvas
        ref={canvasRef}
        width={300}
        height={300}
        className="mb-4 bg-gray-700 w-60 h-60"
        onClick={handleCanvasClick}
      />
      <div className="mb-2 text-sm">
        Series (Bo{seriesLength}): Player {score.player} - AI {score.ai} | Draws: {score.draw} | Highscore: {highScore}
      </div>
      <div className="mb-4" role="status" aria-live="polite">
        {paused ? 'Paused' : status}
      </div>
      <div className="flex space-x-4 flex-wrap justify-center">
        <button
          className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded"
          onClick={restart}
          onTouchStart={restart}
        >
          Restart
        </button>
        <button
          className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded"
          onClick={reset}
          onTouchStart={reset}
        >
          Reset
        </button>
        <button
          className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded"
          onClick={toggleStartPlayer}
          onTouchStart={toggleStartPlayer}
        >
          Start: {player}
        </button>
        <button
          className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded"
          onClick={() => setPaused((p) => !p)}
          onTouchStart={() => setPaused((p) => !p)}
        >
          {paused ? 'Resume' : 'Pause'}
        </button>
        <button
          className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded"
          onClick={() => setSound((s) => !s)}
          onTouchStart={() => setSound((s) => !s)}
        >
          Sound: {sound ? 'On' : 'Off'}
        </button>
      </div>
    </div>
  );
};

export { checkWinner, minimax };

export default function TicTacToeApp() {
  return (
    <GameLayout gameId="tictactoe">
      <TicTacToe />
    </GameLayout>
  );
}
