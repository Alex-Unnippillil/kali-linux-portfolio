"use client";

import React, { useRef, useEffect, useState } from "react";
import GameShell from "../../components/games/GameShell";
import usePersistentState from "../../hooks/usePersistentState";
import { hasOffscreenCanvas } from "../../utils/feature";
import { DEFAULT_GRID_SIZE, createState, step, GameState } from "./logic";

const CELL_SIZE = 16;

const Snake = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const workerRef = useRef<Worker | null>(null);
  const [useWorker, setUseWorker] = useState(false);
  const [wrap, setWrap] = usePersistentState<boolean>("snake:wrap", false);
  const [speed, setSpeed] = usePersistentState<number>("snake:speed", 150);
  const [gridSize, setGridSize] = usePersistentState<number>(
    "snake:gridSize",
    DEFAULT_GRID_SIZE,
  );
  const [state, setState] = useState<GameState>(() =>
    createState(wrap, gridSize),
  );
  const [score, setScore] = useState(0);
  const [foodAnim, setFoodAnim] = useState(1);
  const runningRef = useRef(true);
  const dirRef = useRef(state.dir);
  const boardSize = gridSize * CELL_SIZE;
  const settingsRef = useRef({ wrap, gridSize, speed });

  useEffect(() => {
    if (typeof window === "undefined") return;
    setUseWorker(typeof Worker === "function" && hasOffscreenCanvas());
  }, []);

  useEffect(() => {
    settingsRef.current = { wrap, gridSize, speed };
  }, [wrap, gridSize, speed]);

  useEffect(() => {
    dirRef.current = state.dir;
  }, [state.dir]);

  useEffect(() => {
    if (useWorker) {
      const worker = workerRef.current;
      if (worker) {
        const size = gridSize * CELL_SIZE;
        if (canvasRef.current) {
          canvasRef.current.width = size;
          canvasRef.current.height = size;
        }
        worker.postMessage({
          type: "updateSettings",
          wrap,
          gridSize,
          reset: true,
        });
        worker.postMessage({
          type: "resize",
          width: size,
          height: size,
          dpr: window.devicePixelRatio || 1,
        });
        setScore(0);
        runningRef.current = true;
      }
      return;
    }
    setState(createState(wrap, gridSize));
    setScore(0);
    setFoodAnim(1);
    runningRef.current = true;
  }, [wrap, gridSize, useWorker]);

  useEffect(() => {
    if (useWorker) return;
    const id = setInterval(() => {
      setState((s) => {
        if (!runningRef.current) return s;
        const result = step(s);
        if (result.gameOver) {
          runningRef.current = false;
        }
        if (result.ate) {
          setScore((sc) => sc + 1);
          setFoodAnim(0);
        }
        return result.state;
      });
    }, speed);
    return () => clearInterval(id);
  }, [speed, useWorker]);

  useEffect(() => {
    if (useWorker) return;
    const handler = (e: KeyboardEvent) => {
      const dir = dirRef.current;
      if (e.key === "ArrowUp" && dir.y !== 1)
        setState((s) => ({ ...s, dir: { x: 0, y: -1 } }));
      if (e.key === "ArrowDown" && dir.y !== -1)
        setState((s) => ({ ...s, dir: { x: 0, y: 1 } }));
      if (e.key === "ArrowLeft" && dir.x !== 1)
        setState((s) => ({ ...s, dir: { x: -1, y: 0 } }));
      if (e.key === "ArrowRight" && dir.x !== -1)
        setState((s) => ({ ...s, dir: { x: 1, y: 0 } }));
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [useWorker]);

  useEffect(() => {
    if (useWorker) return;
    if (foodAnim < 1) {
      const id = requestAnimationFrame(() =>
        setFoodAnim((f) => Math.min(f + 0.1, 1)),
      );
      return () => cancelAnimationFrame(id);
    }
  }, [foodAnim, useWorker]);

  useEffect(() => {
    if (useWorker) return;
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    ctx.fillStyle = "#111827";
    ctx.fillRect(0, 0, boardSize, boardSize);
    const foodX = state.food.x * CELL_SIZE;
    const foodY = state.food.y * CELL_SIZE;
    const size = CELL_SIZE * foodAnim;
    ctx.fillStyle = "#facc15";
    ctx.fillRect(
      foodX + (CELL_SIZE - size) / 2,
      foodY + (CELL_SIZE - size) / 2,
      size,
      size,
    );
    ctx.fillStyle = "#3b82f6";
    state.snake.forEach((seg) => {
      ctx.fillRect(seg.x * CELL_SIZE, seg.y * CELL_SIZE, CELL_SIZE, CELL_SIZE);
    });
  }, [state, foodAnim, boardSize, useWorker]);

  useEffect(() => {
    if (!useWorker) return;
    workerRef.current?.postMessage({ type: "updateSettings", speed });
  }, [speed, useWorker]);

  useEffect(() => {
    if (!useWorker) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const worker = new Worker(new URL("./snake.worker.ts", import.meta.url));
    workerRef.current = worker;
    const offscreen = canvas.transferControlToOffscreen();
    const { wrap: initialWrap, gridSize: initialGrid, speed: initialSpeed } =
      settingsRef.current;
    const size = initialGrid * CELL_SIZE;
    canvas.width = size;
    canvas.height = size;
    worker.postMessage(
      {
        type: "init",
        canvas: offscreen,
        width: size,
        height: size,
        dpr: window.devicePixelRatio || 1,
        wrap: initialWrap,
        gridSize: initialGrid,
        speed: initialSpeed,
      },
      [offscreen],
    );

    const handleMessage = (event: MessageEvent<any>) => {
      const data = event.data;
      if (data?.type !== "state") return;
      setScore(data.score);
      runningRef.current = data.running;
    };
    worker.addEventListener("message", handleMessage);

    const keyHandler = (e: KeyboardEvent) => {
      if (
        e.key === "ArrowUp" ||
        e.key === "ArrowDown" ||
        e.key === "ArrowLeft" ||
        e.key === "ArrowRight"
      ) {
        e.preventDefault();
        worker.postMessage({ type: "direction", key: e.key });
      }
    };
    window.addEventListener("keydown", keyHandler);

    return () => {
      worker.removeEventListener("message", handleMessage);
      worker.terminate();
      workerRef.current = null;
      window.removeEventListener("keydown", keyHandler);
    };
  }, [useWorker]);

  const settings = (
    <div className="flex flex-col space-y-2">
      <label className="flex items-center space-x-2">
        <input
          type="checkbox"
          aria-label="Toggle wrap edges"
          checked={wrap}
          onChange={(e) => setWrap(e.target.checked)}
        />
        <span>Wrap edges</span>
      </label>
      <label className="flex items-center space-x-2">
        <span>Map size</span>
        <select
          aria-label="Select map size"
          value={gridSize}
          onChange={(e) => setGridSize(parseInt(e.target.value, 10))}
        >
          {[10, 15, 20, 25, 30].map((s) => (
            <option key={s} value={s}>
              {s}x{s}
            </option>
          ))}
        </select>
      </label>
    </div>
  );

  const speeds = [
    { label: "Slow", value: 200 },
    { label: "Normal", value: 150 },
    { label: "Fast", value: 100 },
  ];

  return (
    <GameShell game="snake" settings={settings}>
      <div className="flex flex-col items-center">
        <div
          className="flex justify-between mb-2 text-white"
          style={{ width: boardSize }}
        >
          <div className="flex space-x-2">
            {speeds.map((s) => (
              <button
                key={s.value}
                type="button"
                onClick={() => setSpeed(s.value)}
                className={`px-2 py-1 rounded-full text-xs ${
                  speed === s.value
                    ? "bg-blue-500 text-white"
                    : "bg-gray-700 text-gray-200"
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>
          <div>Score: {score}</div>
        </div>
        <canvas
          ref={canvasRef}
          width={boardSize}
          height={boardSize}
          aria-label="Snake playfield"
        />
      </div>
    </GameShell>
  );
};

export default Snake;
