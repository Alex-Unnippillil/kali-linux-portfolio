"use client";

import React, { useCallback, useEffect, useRef, useState } from 'react';
import seedrandom from 'seedrandom';
import GameLayout from './GameLayout';
import useCanvasResize from '../../hooks/useCanvasResize';
import BreakoutEditor from './breakoutEditor';
import BreakoutLevels from './breakoutLevels';
import {
  DEFAULT_HEIGHT,
  DEFAULT_WIDTH,
  BreakoutState,
  createState,
  defaultGrid,
  resetLevel,
  stepBreakout,
} from './breakout/engine';
import { renderBreakout } from './breakout/render';
import { Grid } from '../../games/breakout/schema';

interface InputState {
  targetX?: number;
  moveLeft: boolean;
  moveRight: boolean;
  release: boolean;
}

const Breakout = () => {
  const canvasRef = useCanvasResize(DEFAULT_WIDTH, DEFAULT_HEIGHT);
  const [selecting, setSelecting] = useState(true);
  const stateRef = useRef<BreakoutState>(createState());
  const animationRef = useRef<number>();
  const lastTimeRef = useRef<number | null>(null);
  const inputRef = useRef<InputState>({ release: false, moveLeft: false, moveRight: false });

  const startLevel = useCallback((layout?: Grid | null) => {
    stateRef.current = createState({ grid: layout ?? defaultGrid() });
    lastTimeRef.current = null;
    setSelecting(false);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || selecting) return undefined;
    const ctx = canvas.getContext('2d');
    if (!ctx) return undefined;

    const handleMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      inputRef.current.targetX = e.clientX - rect.left;
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') inputRef.current.moveLeft = true;
      if (e.key === 'ArrowRight') inputRef.current.moveRight = true;
      if (e.key === ' ') inputRef.current.release = true;
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') inputRef.current.moveLeft = false;
      if (e.key === 'ArrowRight') inputRef.current.moveRight = false;
    };

    const handleClick = () => {
      inputRef.current.release = true;
    };

    const loop = (timestamp: number) => {
      if (!ctx) return;
      if (lastTimeRef.current === null) {
        lastTimeRef.current = timestamp;
      }
      const delta = (timestamp - (lastTimeRef.current ?? timestamp)) / 1000;
      lastTimeRef.current = timestamp;

      const result = stepBreakout(stateRef.current, delta, inputRef.current);
      inputRef.current.release = false;

      if (result.levelCleared) {
        stateRef.current.levelIndex += 1;
        resetLevel(stateRef.current);
      }

      renderBreakout(ctx, stateRef.current);
      animationRef.current = requestAnimationFrame(loop);
    };

    animationRef.current = requestAnimationFrame(loop);

    canvas.addEventListener('mousemove', handleMove);
    canvas.addEventListener('click', handleClick);
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
      canvas.removeEventListener('mousemove', handleMove);
      canvas.removeEventListener('click', handleClick);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      lastTimeRef.current = null;
    };
  }, [canvasRef, selecting]);

  return (
    <GameLayout gameId="breakout" editor={<BreakoutEditor onLoad={startLevel} />}>
      {selecting && <BreakoutLevels onSelect={startLevel} />}
      <canvas ref={canvasRef} className="w-full h-full bg-black" width={DEFAULT_WIDTH} height={DEFAULT_HEIGHT} />
    </GameLayout>
  );
};

export default Breakout;

// Backwards compatibility for existing tests
export const createRng = (seed?: string) => (seed ? seedrandom(seed) : Math.random);
