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
  const [highScore, setHighScore] = usePersistentState<number>(
    "snake:highScore",
    0,
  );
  const [state, setState] = useState<GameState>(() =>
    createState(wrap, gridSize),
  );
  const [score, setScore] = useState(0);
  const [foodAnim, setFoodAnim] = useState(1);
  const runningRef = useRef(true);

  // reset when wrap or grid size changes
  useEffect(() => {
    setState(createState(wrap, gridSize));
    setScore(0);
    runningRef.current = true;
  }, [wrap, gridSize]);

  useEffect(() => {
    if (score > highScore) {
      setHighScore(score);
    }
  }, [score, highScore, setHighScore]);

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
    ctx.fillRect(0, 0, state.gridSize * CELL_SIZE, state.gridSize * CELL_SIZE);
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

  const width = state.gridSize * CELL_SIZE;
  const canShare = highScore > 0;
  const shareScore = () => {
    if (!canShare) return;
    const url = window.location.href;
    const text = `I scored ${highScore} in Snake!`;
    if (navigator.share) {
      navigator
        .share({ text, url })
        .catch(() => navigator.clipboard?.writeText(`${text} ${url}`));
      return;
    }
    const tweetUrl = new URL("https://twitter.com/intent/tweet");
    tweetUrl.searchParams.set("text", text);
    tweetUrl.searchParams.set("url", url);
    window.open(tweetUrl.toString(), "_blank", "noopener,noreferrer");
  };

  return (
    <GameShell game="snake" settings={settings}>
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
          <div className="flex items-center gap-3">
            <div>
              Score: {score} <span className="text-xs text-slate-300">Best</span>{" "}
              {highScore}
            </div>
            <button
              type="button"
              onClick={shareScore}
              disabled={!canShare}
              className={`px-2 py-1 rounded-full text-xs ${
                canShare
                  ? "bg-slate-700 text-white hover:bg-slate-600"
                  : "bg-slate-800 text-slate-500 cursor-not-allowed"
              }`}
            >
              Share score
            </button>
          </div>
        </div>
        <canvas ref={canvasRef} width={width} height={width} />
      </div>
    </GameShell>
  );
};

export default Snake;
