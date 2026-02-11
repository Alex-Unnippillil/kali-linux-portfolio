import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createInitialState, step, type Direction, type EngineOptions, type GameState } from '../../../../apps/pacman/engine';
import type { LevelDefinition } from '../../../../apps/pacman/types';
import { useGameLoop } from '../../Games/common';

const FIXED_STEP = 1 / 120;
const MAX_DELTA = 0.1;
const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

interface UsePacmanControllerArgs {
  level: LevelDefinition;
  options: EngineOptions;
  started: boolean;
  paused: boolean;
  onEvents: (events: ReturnType<typeof step>['events'], state: GameState) => void;
}

export const usePacmanController = ({ level, options, started, paused, onEvents }: UsePacmanControllerArgs) => {
  const [state, setState] = useState<GameState>(() => createInitialState(level, options));
  const [renderTime, setRenderTime] = useState(0);
  const directionRef = useRef<Direction | null>(null);
  const accumulatorRef = useRef(0);
  const optionsRef = useRef(options);
  const stateRef = useRef(state);

  useEffect(() => {
    optionsRef.current = options;
  }, [options]);

  useEffect(() => {
    const next = createInitialState(level, options);
    setState(next);
    stateRef.current = next;
    accumulatorRef.current = 0;
    setRenderTime(0);
  }, [level, options]);

  const reset = useCallback(() => {
    const next = createInitialState(level, optionsRef.current);
    setState(next);
    stateRef.current = next;
    accumulatorRef.current = 0;
    setRenderTime(0);
  }, [level]);

  const setBufferedDirection = useCallback((dir: Direction) => {
    directionRef.current = dir;
  }, []);

  useGameLoop((delta) => {
    const clamped = clamp(delta, 0, MAX_DELTA);
    accumulatorRef.current += clamped;
    setRenderTime((current) => current + clamped);

    if (!started || paused) return;

    while (accumulatorRef.current >= FIXED_STEP) {
      const result = step(stateRef.current, { direction: directionRef.current }, FIXED_STEP, optionsRef.current);
      directionRef.current = null;
      stateRef.current = result.state;
      accumulatorRef.current -= FIXED_STEP;
      onEvents(result.events, result.state);
    }

    setState({ ...stateRef.current });
  }, true);

  const selectors = useMemo(() => ({
    score: state.score,
    lives: state.pac.lives,
    pellets: state.pelletsRemaining,
    mode: state.mode,
    status: state.status,
  }), [state]);

  return { state, selectors, setBufferedDirection, reset, renderTime, setState };
};
