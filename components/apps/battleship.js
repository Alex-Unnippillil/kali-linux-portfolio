import React, { useRef, useState, useEffect, useCallback } from 'react';
import usePersistentState from '../hooks/usePersistentState';

const BOARD_SIZE = 10;
const CELL = 32;
const SHIPS = [5, 4, 3, 3, 2];

const Battleship = () => {
  const playerCanvas = useRef(null);
  const enemyCanvas = useRef(null);
  const [playerBoard, setPlayerBoard] = useState(
    Array(BOARD_SIZE * BOARD_SIZE).fill(null)
  );
  const [enemyBoard, setEnemyBoard] = useState(
    Array(BOARD_SIZE * BOARD_SIZE).fill(null)
  );
  const playerBoardRef = useRef(playerBoard);
  const enemyBoardRef = useRef(enemyBoard);
  const [playerTurn, setPlayerTurn] = useState(true);
  const [paused, setPaused] = useState(false);
  const [sound, setSound] = useState(true);
  const [stats, setStats] = usePersistentState('battleship-stats', {
    wins: 0,
    losses: 0,
  });
  const availableShots = useRef(new Set());

  // keep refs in sync
  useEffect(() => {
    playerBoardRef.current = playerBoard;
  }, [playerBoard]);
  useEffect(() => {
    enemyBoardRef.current = enemyBoard;
  }, [enemyBoard]);

  const randomBoard = () => {
    const board = Array(BOARD_SIZE * BOARD_SIZE).fill(null);
    for (const len of SHIPS) {
      let placed = false;
      while (!placed) {
        const dir = Math.random() < 0.5 ? 0 : 1; // 0 horiz,1 vert
        const maxX = dir === 0 ? BOARD_SIZE - len : BOARD_SIZE - 1;
        const maxY = dir === 1 ? BOARD_SIZE - len : BOARD_SIZE - 1;
        const x = Math.floor(Math.random() * (maxX + 1));
        const y = Math.floor(Math.random() * (maxY + 1));
        let ok = true;
        for (let i = 0; i < len; i++) {
          const cx = x + (dir === 0 ? i : 0);
          const cy = y + (dir === 1 ? i : 0);
          const idx = cy * BOARD_SIZE + cx;
          if (board[idx] === 'ship') {
            ok = false;
            break;
          }
        }
        if (ok) {
          for (let i = 0; i < len; i++) {
            const cx = x + (dir === 0 ? i : 0);
            const cy = y + (dir === 1 ? i : 0);
            const idx = cy * BOARD_SIZE + cx;
            board[idx] = 'ship';
          }
          placed = true;
        }
      }
    }
    return board;
  };

  const reset = useCallback(() => {
    const pb = randomBoard();
    const eb = randomBoard();
    setPlayerBoard(pb);
    setEnemyBoard(eb);
    playerBoardRef.current = pb;
    enemyBoardRef.current = eb;
    availableShots.current = new Set(
      Array.from({ length: BOARD_SIZE * BOARD_SIZE }, (_, i) => i)
    );
    setPlayerTurn(true);
    setPaused(false);
  }, []);

  useEffect(() => {
    reset();
  }, [reset]);

  const drawBoard = (ctx, board, showShips) => {
    ctx.clearRect(0, 0, CELL * BOARD_SIZE, CELL * BOARD_SIZE);
    for (let y = 0; y < BOARD_SIZE; y++) {
      for (let x = 0; x < BOARD_SIZE; x++) {
        const idx = y * BOARD_SIZE + x;
        ctx.strokeStyle = '#555';
        ctx.strokeRect(x * CELL, y * CELL, CELL, CELL);
        const val = board[idx];
        if (val === 'hit') {
          ctx.fillStyle = 'red';
          ctx.fillRect(x * CELL, y * CELL, CELL, CELL);
        } else if (val === 'miss') {
          ctx.fillStyle = 'white';
          ctx.fillRect(x * CELL, y * CELL, CELL, CELL);
        } else if (showShips && val === 'ship') {
          ctx.fillStyle = 'gray';
          ctx.fillRect(x * CELL, y * CELL, CELL, CELL);
        }
      }
    }
  };

  const draw = useCallback(() => {
    const pc = playerCanvas.current;
    const ec = enemyCanvas.current;
    if (!pc || !ec) return;
    const pctx = pc.getContext('2d');
    const ectx = ec.getContext('2d');
    drawBoard(pctx, playerBoardRef.current, true);
    drawBoard(ectx, enemyBoardRef.current, false);
  }, []);

  useEffect(() => {
    let frame;
    const loop = () => {
      draw();
      frame = requestAnimationFrame(loop);
    };
    frame = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(frame);
  }, [draw]);

  const playSound = useCallback(
    (freq) => {
      if (!sound) return;
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = freq;
      osc.start();
      osc.stop(ctx.currentTime + 0.1);
    },
    [sound]
  );

  const checkWin = (board) => board.every((c) => c !== 'ship');

  const handlePlayerShot = (e) => {
    if (!playerTurn || paused) return;
    const rect = enemyCanvas.current.getBoundingClientRect();
    const x = Math.floor((e.clientX - rect.left) / CELL);
    const y = Math.floor((e.clientY - rect.top) / CELL);
    if (x < 0 || y < 0 || x >= BOARD_SIZE || y >= BOARD_SIZE) return;
    const idx = y * BOARD_SIZE + x;
    if (enemyBoardRef.current[idx] === 'hit' || enemyBoardRef.current[idx] === 'miss')
      return;
    const board = enemyBoardRef.current.slice();
    const hit = board[idx] === 'ship';
    board[idx] = hit ? 'hit' : 'miss';
    setEnemyBoard(board);
    enemyBoardRef.current = board;
    playSound(hit ? 880 : 220);
    if (checkWin(board)) {
      setStats((s) => ({ ...s, wins: s.wins + 1 }));
      setPaused(true);
      return;
    }
    setPlayerTurn(false);
    setTimeout(cpuMove, 500);
  };

  const cpuMove = () => {
    if (paused) return;
    const choices = Array.from(availableShots.current);
    if (!choices.length) return;
    const idx = choices[Math.floor(Math.random() * choices.length)];
    availableShots.current.delete(idx);
    const board = playerBoardRef.current.slice();
    const hit = board[idx] === 'ship';
    board[idx] = hit ? 'hit' : 'miss';
    setPlayerBoard(board);
    playerBoardRef.current = board;
    playSound(hit ? 880 : 220);
    if (checkWin(board)) {
      setStats((s) => ({ ...s, losses: s.losses + 1 }));
      setPaused(true);
    } else {
      setPlayerTurn(true);
    }
  };

  return (
    <div className="h-full w-full flex flex-col items-center justify-start bg-ub-cool-grey text-white p-4 overflow-auto font-ubu ntu">
      <div className="mb-2 flex space-x-2 items-center">
        <button className="px-2 py-1 bg-gray-700" onClick={reset}>
          Reset
        </button>
        <button
          className="px-2 py-1 bg-gray-700"
          onClick={() => setPaused((p) => !p)}
        >
          {paused ? 'Resume' : 'Pause'}
        </button>
        <button
          className="px-2 py-1 bg-gray-700"
          onClick={() => setSound((s) => !s)}
        >
          {sound ? 'Sound: On' : 'Sound: Off'}
        </button>
        <div className="ml-4 text-sm">W: {stats.wins} L: {stats.losses}</div>
      </div>
      <div className="flex space-x-8">
        <canvas
          ref={playerCanvas}
          width={BOARD_SIZE * CELL}
          height={BOARD_SIZE * CELL}
        />
        <canvas
          ref={enemyCanvas}
          width={BOARD_SIZE * CELL}
          height={BOARD_SIZE * CELL}
          onClick={handlePlayerShot}
        />
      </div>
    </div>
  );
};

export default Battleship;

