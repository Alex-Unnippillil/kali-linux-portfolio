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
  const stats = useRef({ lines: 0, tSpins: 0, score: 0 });
  const socketRef = useRef<WebSocket | null>(null);
  const workerRef = useRef<Worker | null>(null);

  const DAS = 150;
  const ARR = 50;

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
  const dropHard = () =>
    setState((s) => {
      hardDrop(s);
      replay.current.push('HD');
      return cloneState(s);
    });
  const rotateCCW = () =>
    setState((s) => {
      rotate(s, -1);
      replay.current.push('Z');
      return cloneState(s);
    });
  const rotateCW = () =>
    setState((s) => {
      rotate(s, 1);
      replay.current.push('X');
      return cloneState(s);
    });
  const hold = () =>
    setState((s) => {
      holdPiece(s);
      replay.current.push('H');
      return cloneState(s);
    });

  const useRepeat = (fn: () => void) => {
    const timeout = useRef<NodeJS.Timeout | null>(null);
    const interval = useRef<NodeJS.Timeout | null>(null);
    const onPointerDown = (e: React.PointerEvent) => {
      e.preventDefault();
      fn();
      timeout.current = setTimeout(() => {
        interval.current = setInterval(fn, ARR);
      }, DAS);
    };
    const clear = () => {
      if (timeout.current) clearTimeout(timeout.current);
      if (interval.current) clearInterval(interval.current);
      timeout.current = null;
      interval.current = null;
    };
    return {
      onPointerDown,
      onPointerUp: clear,
      onPointerLeave: clear,
    };
  };

  const leftHandlers = useRepeat(moveLeft);
  const rightHandlers = useRepeat(moveRight);
  const downHandlers = useRepeat(dropSoft);

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
    let lTimeout: any = null;
    let rTimeout: any = null;
    let lInterval: any = null;
    let rInterval: any = null;
    let dInterval: any = null;

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
        dropHard();
      } else if (e.key === 'z') {
        rotateCCW();
      } else if (e.key === 'x') {
        rotateCW();
      } else if (e.key === 'Shift') {
        hold();
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
          const res = s.gameOver ? null : step(s);
          if (res) {
            stats.current.lines += res.lines;
            stats.current.score = s.score;
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
    <div className="p-4 relative select-none">
      <canvas ref={boardRef} className="absolute" />
      <div className="mt-4 text-white">
        <div>Score: {state.score}</div>
        <div>Lines: {state.linesCleared}</div>
        <div>T-Spins: {stats.current.tSpins}</div>
      </div>
      <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-2">
        <button
          {...leftHandlers}
          className="px-3 py-2 bg-gray-700 text-white rounded"
        >
          ◀
        </button>
        <button
          {...rightHandlers}
          className="px-3 py-2 bg-gray-700 text-white rounded"
        >
          ▶
        </button>
        <button
          {...downHandlers}
          className="px-3 py-2 bg-gray-700 text-white rounded"
        >
          ▼
        </button>
        <button
          onPointerDown={(e) => {
            e.preventDefault();
            rotateCW();
          }}
          className="px-3 py-2 bg-gray-700 text-white rounded"
        >
          ⟳
        </button>
        <button
          onPointerDown={(e) => {
            e.preventDefault();
            dropHard();
          }}
          className="px-3 py-2 bg-gray-700 text-white rounded"
        >
          ⤓
        </button>
        <button
          onPointerDown={(e) => {
            e.preventDefault();
            hold();
          }}
          className="px-3 py-2 bg-gray-700 text-white rounded"
        >
          H
        </button>
      </div>
    </div>
  );
};

export default Tetris;
