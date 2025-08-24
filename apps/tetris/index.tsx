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
  softDrop,
} from './engine';


const Tetris: React.FC = () => {
  const [state, setState] = useState<GameState>(() => createGame());
  const boardRef = useRef<HTMLCanvasElement>(null);
  const replay = useRef<string[]>([]);
  const stats = useRef({ lines: 0, tSpins: 0 });
  const socketRef = useRef<WebSocket | null>(null);
  const workerRef = useRef<Worker | null>(null);

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
    const DAS = 150;
    const ARR = 50;
    let lTimeout: any = null;
    let rTimeout: any = null;
    let lInterval: any = null;
    let rInterval: any = null;
    let dInterval: any = null;

    const moveLeft = () =>
      setState((s) => {
        move(s, -1, 0);
        replay.current.push('L');
        return cloneState(s);
      });
    const moveRight = () =>
      setState((s) => {
        move(s, 1, 0);
        replay.current.push('R');
        return cloneState(s);
      });
    const dropSoft = () =>
      setState((s) => {
        softDrop(s);
        replay.current.push('D');
        return cloneState(s);
      });

    const keydown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') {
        if (lTimeout || lInterval) return;
        moveLeft();
        lTimeout = setTimeout(() => {
          lInterval = setInterval(moveLeft, ARR);
        }, DAS);
      } else if (e.key === 'ArrowRight') {
        if (rTimeout || rInterval) return;
        moveRight();
        rTimeout = setTimeout(() => {
          rInterval = setInterval(moveRight, ARR);
        }, DAS);
      } else if (e.key === 'ArrowDown') {
        if (dInterval) return;
        dInterval = setInterval(dropSoft, ARR);
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

    const keyup = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') {
        clearTimeout(lTimeout);
        clearInterval(lInterval);
        lTimeout = null;
        lInterval = null;
      } else if (e.key === 'ArrowRight') {
        clearTimeout(rTimeout);
        clearInterval(rInterval);
        rTimeout = null;
        rInterval = null;
      } else if (e.key === 'ArrowDown') {
        clearInterval(dInterval);
        dInterval = null;
      }
    };

    window.addEventListener('keydown', keydown);
    window.addEventListener('keyup', keyup);
    return () => {
      window.removeEventListener('keydown', keydown);
      window.removeEventListener('keyup', keyup);
      clearTimeout(lTimeout);
      clearTimeout(rTimeout);
      clearInterval(lInterval);
      clearInterval(rInterval);
      clearInterval(dInterval);
    };
  }, []);

  useEffect(() => {
    const canvas = boardRef.current!;
    canvas.width = COLS * CELL_SIZE;
    canvas.height = ROWS * CELL_SIZE;
    const off = (canvas as any).transferControlToOffscreen();
    const worker = new Worker(new URL('./renderer.worker.ts', import.meta.url));
    workerRef.current = worker;
    worker.postMessage({ type: 'init', canvas: off }, [off]);
    return () => worker.terminate();
  }, []);

  useEffect(() => {
    workerRef.current?.postMessage({ type: 'state', state });
  }, [state]);

  useEffect(() => {
    let last = 0;
    let frame: number;
    const dropInterval = 1000;
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
      frame = requestAnimationFrame(update);
    };
    frame = requestAnimationFrame(update);
    return () => cancelAnimationFrame(frame);
  }, []);

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
      <div className="mt-4 text-white">
        <div>Lines: {stats.current.lines}</div>
        <div>T-Spins: {stats.current.tSpins}</div>
      </div>
    </div>
  );
};

export default Tetris;
