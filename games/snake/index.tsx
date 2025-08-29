"use client";

import React, { useRef, useEffect, useState } from "react";
import GameShell from "../../components/games/GameShell";
import usePersistentState from "../../hooks/usePersistentState";
import { GRID_SIZE, createState, step, GameState } from "./logic";

const CELL_SIZE = 16;

const Snake = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [walls, setWalls] = usePersistentState<boolean>("snake:walls", true);
  const [baseSpeed, setBaseSpeed] = usePersistentState<number>(
    "snake:speed",
    150,
  );
  const [speed, setSpeed] = useState(baseSpeed);
  const [state, setState] = useState<GameState>(() => createState(!walls));
  const [score, setScore] = useState(0);
  const [foodAnim, setFoodAnim] = useState(1);
  const runningRef = useRef(true);

  // reset speed when base speed changes
  useEffect(() => {
    setSpeed(baseSpeed);
  }, [baseSpeed]);

  // keep state.wrap in sync with walls toggle
  useEffect(() => {
    setState((s) => ({ ...s, wrap: !walls }));
    setScore(0);
    setSpeed(baseSpeed);
    runningRef.current = true;
  }, [walls, baseSpeed]);

  // game loop
  useEffect(() => {
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
          setSpeed((sp) => Math.max(30, sp * 0.95));
        }
        return result.state;
      });
    }, speed);
    return () => clearInterval(id);
  }, [speed]);

  // food spawn animation
  useEffect(() => {
    if (foodAnim < 1) {
      const id = requestAnimationFrame(() =>
        setFoodAnim((f) => Math.min(f + 0.1, 1)),
      );
      return () => cancelAnimationFrame(id);
    }
  }, [foodAnim]);

  // draw
  useEffect(() => {
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    ctx.fillStyle = "#111827";
    ctx.fillRect(0, 0, GRID_SIZE * CELL_SIZE, GRID_SIZE * CELL_SIZE);
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
  }, [state, foodAnim]);

  // controls
  const dirRef = useRef(state.dir);
  useEffect(() => {
    dirRef.current = state.dir;
  }, [state.dir]);
  useEffect(() => {
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
      if (e.key.toLowerCase() === "w") setWalls((w) => !w);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  const settings = (
    <label className="flex items-center space-x-2">
      <input
        type="checkbox"
        checked={walls}
        onChange={(e) => setWalls(e.target.checked)}
      />
      <span>Walls</span>
    </label>
  );

  const speeds = [
    { label: "Slow", value: 200 },
    { label: "Normal", value: 150 },
    { label: "Fast", value: 100 },
  ];

  const width = GRID_SIZE * CELL_SIZE;

  return (
    <GameShell settings={settings}>
      <div className="flex flex-col items-center">
        <div className="flex justify-between mb-2 text-white" style={{ width }}>
          <div className="flex space-x-2">
            {speeds.map((s) => (
              <button
                key={s.value}
                onClick={() => setBaseSpeed(s.value)}
                className={`px-2 py-1 rounded-full text-xs ${
                  baseSpeed === s.value
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
        <canvas ref={canvasRef} width={width} height={width} />
      </div>
    </GameShell>
  );
};

export default Snake;
