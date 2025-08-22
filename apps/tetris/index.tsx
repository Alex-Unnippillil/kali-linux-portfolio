import React, { useEffect, useRef, useState } from 'react';
import {
  createGame,
  move,
  rotate,
  hardDrop,
  hold as holdPiece,
  step,
  addGarbage,
  CELL_SIZE,
  COLS,
  ROWS,
  GameState,
  cloneState,
} from './engine';

const COLORS = ['#000', '#0ff', '#00f', '#f80', '#ff0', '#0f0', '#a0f', '#f00', '#888'];
const TYPE_COLOR = {
  I: COLORS[1],
  J: COLORS[2],
  L: COLORS[3],
  O: COLORS[4],
  S: COLORS[5],
  T: COLORS[6],
  Z: COLORS[7],
};

const Tetris: React.FC = () => {
  const [state, setState] = useState<GameState>(() => createGame());
  const boardRef = useRef<HTMLCanvasElement>(null);
  const activeRef = useRef<HTMLCanvasElement>(null);
  const replay = useRef<string[]>([]);
  const stats = useRef({ lines: 0, tSpins: 0 });
  const socketRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    const ws = new WebSocket('ws://localhost:3001');
    socketRef.current = ws;
    ws.onmessage = (ev) => {
      const msg = JSON.parse(ev.data);
      if (msg.type === 'garbage') {
        setState((s) => {
          addGarbage(s, msg.lines);
          return cloneState(s);
        });
      }
    };
    return () => {
      ws.close();
    };
  }, []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.repeat) return;
      if (e.key === 'ArrowLeft') {
        setState((s) => {
          move(s, -1, 0);
          replay.current.push('L');
          return cloneState(s);
        });
      } else if (e.key === 'ArrowRight') {
        setState((s) => {
          move(s, 1, 0);
          replay.current.push('R');
          return cloneState(s);
        });
      } else if (e.key === 'ArrowDown') {
        setState((s) => {
          move(s, 0, 1);
          replay.current.push('D');
          return cloneState(s);
        });
      } else if (e.key === ' ') {
        e.preventDefault();
        setState((s) => {
          hardDrop(s);
          replay.current.push('HD');
          return cloneState(s);
        });
      } else if (e.key === 'z') {
        setState((s) => {
          rotate(s, -1);
          replay.current.push('Z');
          return cloneState(s);
        });
      } else if (e.key === 'x') {
        setState((s) => {
          rotate(s, 1);
          replay.current.push('X');
          return cloneState(s);
        });
      } else if (e.key === 'Shift') {
        setState((s) => {
          holdPiece(s);
          replay.current.push('H');
          return cloneState(s);
        });
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  useEffect(() => {
    const canvas = boardRef.current!;
    canvas.width = COLS * CELL_SIZE;
    canvas.height = ROWS * CELL_SIZE;
    const activeCanvas = activeRef.current!;
    activeCanvas.width = COLS * CELL_SIZE;
    activeCanvas.height = ROWS * CELL_SIZE;

    let last = 0;
    let frame: number;
    const dropInterval = 1000;
    const ctx = canvas.getContext('2d')!;
    const activeCtx = activeCanvas.getContext('2d')!;

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      for (let y = 0; y < ROWS; y++) {
        for (let x = 0; x < COLS; x++) {
          const v = state.board[y][x];
          if (v) {
            ctx.fillStyle = COLORS[v];
            ctx.fillRect(x * CELL_SIZE, y * CELL_SIZE, CELL_SIZE, CELL_SIZE);
          }
        }
      }

      activeCtx.clearRect(0, 0, canvas.width, canvas.height);
      const piece = state.current;
      const ghost = cloneState(state);
      while (move(ghost, 0, 1));
      for (let y = 0; y < piece.shape.length; y++) {
        for (let x = 0; x < piece.shape[y].length; x++) {
          if (piece.shape[y][x]) {
            activeCtx.fillStyle = TYPE_COLOR[piece.type];
            activeCtx.globalAlpha = 0.3;
            activeCtx.fillRect(
              (ghost.current.x + x) * CELL_SIZE,
              (ghost.current.y + y) * CELL_SIZE,
              CELL_SIZE,
              CELL_SIZE
            );
            activeCtx.globalAlpha = 1;
            activeCtx.fillRect(
              (piece.x + x) * CELL_SIZE,
              (piece.y + y) * CELL_SIZE,
              CELL_SIZE,
              CELL_SIZE
            );
          }
        }
      }
    };

    const update = (time: number) => {
      if (time - last > dropInterval) {
        setState((s) => {
          const res = step(s);
          if (res) {
            stats.current.lines += res.lines;
            if (res.tSpin) stats.current.tSpins += 1;
            if (res.lines && socketRef.current) {
              socketRef.current.send(
                JSON.stringify({ type: 'attack', lines: res.lines })
              );
            }
          }
          last = time;
          return cloneState(s);
        });
      }
      draw();
      frame = requestAnimationFrame(update);
    };
    frame = requestAnimationFrame(update);
    return () => cancelAnimationFrame(frame);
  }, [state]);

  useEffect(() => {
    return () => {
      fetch('/api/tetris/stats', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(stats.current),
      });
      fetch('/api/tetris/replay', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ moves: replay.current }),
      });
    };
  }, []);

  return (
    <div className="p-4">
      <canvas ref={boardRef} className="absolute" />
      <canvas ref={activeRef} className="absolute" />
      <div className="mt-4 text-white">
        <div>Lines: {stats.current.lines}</div>
        <div>T-Spins: {stats.current.tSpins}</div>
      </div>
    </div>
  );
};

export default Tetris;
