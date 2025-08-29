"use client";

import React, { useRef, useEffect, useState } from "react";
import GameShell from "../../components/games/GameShell";
import usePersistentState from "../../hooks/usePersistentState";
import { GRID_SIZE, createState, step, GameState } from "./logic";

const CELL_SIZE = 16;

const Snake = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [wrap, setWrap] = usePersistentState<boolean>("snake:wrap", false);
  const [state, setState] = useState<GameState>(() => createState(wrap));
  const runningRef = useRef(true);

  // keep state.wrap in sync with persisted wrap
  useEffect(() => {
    setState((s) => ({ ...s, wrap }));
    runningRef.current = true;
  }, [wrap]);

  // game loop
  useEffect(() => {
    const id = setInterval(() => {
      setState((s) => {
        if (!runningRef.current) return s;
        const result = step(s);
        if (result.gameOver) {
          runningRef.current = false;
        }
        return result.state;
      });
    }, 150);
    return () => clearInterval(id);
  }, []);

  // draw
  useEffect(() => {
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    ctx.fillStyle = "#111827";
    ctx.fillRect(0, 0, GRID_SIZE * CELL_SIZE, GRID_SIZE * CELL_SIZE);
    ctx.fillStyle = "#ef4444";
    ctx.fillRect(state.food.x * CELL_SIZE, state.food.y * CELL_SIZE, CELL_SIZE, CELL_SIZE);
    ctx.fillStyle = "#22c55e";
    state.snake.forEach((seg) => {
      ctx.fillRect(seg.x * CELL_SIZE, seg.y * CELL_SIZE, CELL_SIZE, CELL_SIZE);
    });
  }, [state]);

  // controls
  const dirRef = useRef(state.dir);
  useEffect(() => {
    dirRef.current = state.dir;
  }, [state.dir]);
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const dir = dirRef.current;
      if (e.key === "ArrowUp" && dir.y !== 1) setState((s) => ({ ...s, dir: { x: 0, y: -1 } }));
      if (e.key === "ArrowDown" && dir.y !== -1) setState((s) => ({ ...s, dir: { x: 0, y: 1 } }));
      if (e.key === "ArrowLeft" && dir.x !== 1) setState((s) => ({ ...s, dir: { x: -1, y: 0 } }));
      if (e.key === "ArrowRight" && dir.x !== -1)
        setState((s) => ({ ...s, dir: { x: 1, y: 0 } }));
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  const settings = (
    <label className="flex items-center space-x-2">
      <input
        type="checkbox"
        checked={wrap}
        onChange={(e) => setWrap(e.target.checked)}
      />
      <span>Wrap edges</span>
    </label>
  );

  return (
    <GameShell settings={settings}>
      <canvas
        ref={canvasRef}
        width={GRID_SIZE * CELL_SIZE}
        height={GRID_SIZE * CELL_SIZE}
      />
    </GameShell>
  );
};

export default Snake;
