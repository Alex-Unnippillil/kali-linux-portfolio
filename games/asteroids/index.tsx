"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import { hasOffscreenCanvas } from "../../utils/feature";
import {
  GameState,
  createGameState,
  drawGameState,
  handleKey,
  resetGameState,
  resizeGameState,
  setPaused as setGamePaused,
  updateGameState,
} from "./engine";

const AsteroidsGame: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const workerRef = useRef<Worker | null>(null);
  const stateRef = useRef<GameState | null>(null);
  const animationRef = useRef<number>();
  const lastRef = useRef<number>(0);
  const scoreRef = useRef(0);
  const livesRef = useRef(3);
  const pausedRef = useRef(false);
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [paused, setPaused] = useState(false);
  const [useWorker, setUseWorker] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    setUseWorker(typeof Worker === "function" && hasOffscreenCanvas());
  }, []);

  useEffect(() => {
    scoreRef.current = score;
  }, [score]);
  useEffect(() => {
    livesRef.current = lives;
  }, [lives]);
  useEffect(() => {
    pausedRef.current = paused;
  }, [paused]);

  const handleResize = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr = window.devicePixelRatio || 1;
    const { clientWidth, clientHeight } = canvas;
    canvas.width = Math.floor(clientWidth * dpr);
    canvas.height = Math.floor(clientHeight * dpr);
    const state = stateRef.current;
    if (state) {
      resizeGameState(state, clientWidth, clientHeight);
    }
  }, []);

  useEffect(() => {
    if (!useWorker) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const worker = new Worker(new URL("./asteroids.worker.ts", import.meta.url));
    workerRef.current = worker;
    const offscreen = canvas.transferControlToOffscreen();
    const initWidth = canvas.clientWidth;
    const initHeight = canvas.clientHeight;
    const initDpr = window.devicePixelRatio || 1;

    worker.postMessage(
      {
        type: "init",
        canvas: offscreen,
        width: initWidth,
        height: initHeight,
        dpr: initDpr,
      },
      [offscreen]
    );

    const handleMessage = (event: MessageEvent<any>) => {
      const data = event.data;
      if (data?.type !== "state") return;
      setScore(data.score);
      setLives(data.lives);
      setPaused(data.paused);
    };

    worker.addEventListener("message", handleMessage);

    const resize = () => {
      const width = canvas.clientWidth;
      const height = canvas.clientHeight;
      worker.postMessage({
        type: "resize",
        width,
        height,
        dpr: window.devicePixelRatio || 1,
      });
    };
    const keydown = (e: KeyboardEvent) => {
      worker.postMessage({ type: "keydown", key: e.key });
      if (
        ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", " ", "Escape"].includes(
          e.key
        )
      ) {
        e.preventDefault();
      }
    };
    const keyup = (e: KeyboardEvent) => {
      worker.postMessage({ type: "keyup", key: e.key });
    };

    window.addEventListener("resize", resize);
    window.addEventListener("keydown", keydown);
    window.addEventListener("keyup", keyup);

    return () => {
      worker.removeEventListener("message", handleMessage);
      worker.terminate();
      workerRef.current = null;
      window.removeEventListener("resize", resize);
      window.removeEventListener("keydown", keydown);
      window.removeEventListener("keyup", keyup);
    };
  }, [useWorker]);

  useEffect(() => {
    if (useWorker) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    handleResize();
    window.addEventListener("resize", handleResize);

    const state = createGameState(canvas.clientWidth, canvas.clientHeight);
    stateRef.current = state;
    setScore(state.score);
    setLives(state.lives);
    setPaused(state.paused);

    const keydown = (e: KeyboardEvent) => {
      if (!stateRef.current) return;
      handleKey(stateRef.current, e.key, true);
      if (
        ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", " ", "Escape"].includes(
          e.key
        )
      ) {
        e.preventDefault();
      }
      setPaused(stateRef.current.paused);
    };
    const keyup = (e: KeyboardEvent) => {
      if (!stateRef.current) return;
      handleKey(stateRef.current, e.key, false);
    };

    window.addEventListener("keydown", keydown);
    window.addEventListener("keyup", keyup);

    lastRef.current = performance.now();
    const step = (now: number) => {
      const current = stateRef.current;
      if (!current) return;
      const dt = (now - lastRef.current) / 1000;
      lastRef.current = now;
      updateGameState(current, dt);
      const dpr = window.devicePixelRatio || 1;
      drawGameState(ctx, current, dpr);
      if (scoreRef.current !== current.score) {
        scoreRef.current = current.score;
        setScore(current.score);
      }
      if (livesRef.current !== current.lives) {
        livesRef.current = current.lives;
        setLives(current.lives);
      }
      if (pausedRef.current !== current.paused) {
        pausedRef.current = current.paused;
        setPaused(current.paused);
      }
      animationRef.current = requestAnimationFrame(step);
    };

    animationRef.current = requestAnimationFrame(step);

    return () => {
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("keydown", keydown);
      window.removeEventListener("keyup", keyup);
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
      stateRef.current = null;
    };
  }, [useWorker, handleResize]);

  const resumeGame = () => {
    if (useWorker) {
      workerRef.current?.postMessage({ type: "setPaused", paused: false });
    } else if (stateRef.current) {
      setGamePaused(stateRef.current, false);
      setPaused(false);
    }
  };

  const resetGame = () => {
    if (useWorker) {
      workerRef.current?.postMessage({ type: "reset" });
    } else if (stateRef.current && canvasRef.current) {
      resetGameState(stateRef.current);
      resizeGameState(
        stateRef.current,
        canvasRef.current.clientWidth,
        canvasRef.current.clientHeight
      );
      setScore(stateRef.current.score);
      setLives(stateRef.current.lives);
      setPaused(stateRef.current.paused);
    }
  };

  return (
    <div className="relative w-full h-full bg-black" data-testid="asteroids-game">
      <canvas
        ref={canvasRef}
        className="w-full h-full"
        aria-label="Asteroids playfield"
      />
      <div className="pointer-events-none absolute inset-0 select-none">
        <div className="absolute top-2 left-2 flex gap-1">
          {Array.from({ length: lives }).map((_, i) => (
            <svg
              key={i}
              width="16"
              height="16"
              viewBox="0 0 16 16"
              className="text-white"
            >
              <polygon
                points="8,2 2,14 14,14"
                fill="none"
                stroke="currentColor"
                strokeWidth="1"
              />
            </svg>
          ))}
        </div>
        <div className="absolute top-2 right-2 text-white text-sm text-right min-w-[40px]">
          {score}
        </div>
        {paused && (
          <div className="pointer-events-auto absolute inset-0 bg-black/60 flex flex-col items-center justify-center gap-2">
            <button
              className="text-[12px] px-2 py-1 bg-white text-black rounded"
              onClick={resumeGame}
            >
              Resume
            </button>
            <button
              className="text-[12px] px-2 py-1 bg-white text-black rounded"
              onClick={resetGame}
            >
              Restart
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default AsteroidsGame;
