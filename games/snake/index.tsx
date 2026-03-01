"use client";

import React, { useRef, useEffect, useState } from "react";
import GameShell from "../../components/games/GameShell";
import usePersistentState from "../../hooks/usePersistentState";
import { DEFAULT_GRID_SIZE, createState, step, GameState } from "./logic";

const CELL_SIZE = 16;

const Snake = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [wrap, setWrap] = usePersistentState<boolean>("snake:wrap", false);
  const [speed, setSpeed] = usePersistentState<number>("snake:speed", 150);
  const [gridSize, setGridSize] = usePersistentState<number>(
    "snake:gridSize",
    DEFAULT_GRID_SIZE,
  );
  const [score, setScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const stateRef = useRef<GameState>(createState(wrap, gridSize));
  const dirRef = useRef(stateRef.current.dir);
  const runningRef = useRef(true);
  const gameOverRef = useRef(false);
  const speedRef = useRef(speed);
  const lastTimeRef = useRef<number | null>(null);
  const accumulatorRef = useRef(0);
  const foodAnimRef = useRef(1);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    speedRef.current = speed;
  }, [speed]);

  // reset when wrap or grid size changes
  useEffect(() => {
    stateRef.current = createState(wrap, gridSize);
    dirRef.current = stateRef.current.dir;
    setScore(0);
    setGameOver(false);
    gameOverRef.current = false;
    runningRef.current = true;
    foodAnimRef.current = 1;
    accumulatorRef.current = 0;
    lastTimeRef.current = null;
  }, [wrap, gridSize]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!ctx) return;

    const draw = (state: GameState, foodAnim: number) => {
      ctx.fillStyle = "#111827";
      ctx.fillRect(
        0,
        0,
        state.gridSize * CELL_SIZE,
        state.gridSize * CELL_SIZE,
      );
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
    };

    const loop = (time: number) => {
      if (lastTimeRef.current === null) {
        lastTimeRef.current = time;
      }
      const delta = time - lastTimeRef.current;
      lastTimeRef.current = time;

      if (runningRef.current) {
        accumulatorRef.current += delta;
        const stepInterval = speedRef.current;

        while (accumulatorRef.current >= stepInterval) {
          const result = step(stateRef.current);
          stateRef.current = result.state;

          if (result.ate) {
            setScore((sc) => sc + 1);
            foodAnimRef.current = 0;
          }

          if (result.gameOver) {
            runningRef.current = false;
            gameOverRef.current = true;
            setGameOver(true);
          }

          accumulatorRef.current -= stepInterval;
        }

        if (foodAnimRef.current < 1) {
          foodAnimRef.current = Math.min(
            1,
            foodAnimRef.current + delta / 150,
          );
        }
      }

      draw(stateRef.current, foodAnimRef.current);
      rafRef.current = requestAnimationFrame(loop);
    };

    rafRef.current = requestAnimationFrame(loop);

    return () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, []);

  // controls
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const dir = dirRef.current;
      if (e.key === "ArrowUp" && dir.y !== 1) {
        dirRef.current = { x: 0, y: -1 };
        stateRef.current.dir = dirRef.current;
      }
      if (e.key === "ArrowDown" && dir.y !== -1) {
        dirRef.current = { x: 0, y: 1 };
        stateRef.current.dir = dirRef.current;
      }
      if (e.key === "ArrowLeft" && dir.x !== 1) {
        dirRef.current = { x: -1, y: 0 };
        stateRef.current.dir = dirRef.current;
      }
      if (e.key === "ArrowRight" && dir.x !== -1) {
        dirRef.current = { x: 1, y: 0 };
        stateRef.current.dir = dirRef.current;
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  const settings = (
    <div className="flex flex-col space-y-2">
      <label className="flex items-center space-x-2">
        <input
          type="checkbox"
          checked={wrap}
          onChange={(e) => setWrap(e.target.checked)}
        />
        <span>Wrap edges</span>
      </label>
      <label className="flex items-center space-x-2">
        <span>Map size</span>
        <select
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

  const width = gridSize * CELL_SIZE;

  return (
    <GameShell
      game="snake"
      settings={settings}
      onPause={() => {
        runningRef.current = false;
      }}
      onResume={() => {
        if (!gameOverRef.current) {
          runningRef.current = true;
          lastTimeRef.current = null;
        }
      }}
    >
      <div className="flex flex-col items-center">
        <div className="flex justify-between mb-2 text-white" style={{ width }}>
          <div className="flex space-x-2">
            {speeds.map((s) => (
              <button
                key={s.value}
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
          width={width}
          height={width}
          role="img"
          aria-label={gameOver ? "Snake game over" : "Snake game"}
        />
      </div>
    </GameShell>
  );
};

export default Snake;
