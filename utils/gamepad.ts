import { useEffect, useRef } from 'react';

export type GamepadButtonBinding = number;
export interface GamepadAxisBinding {
  axis: number;
  dir?: 1 | -1;
  threshold?: number;
}
export type GamepadBinding = GamepadButtonBinding | GamepadAxisBinding;
export type GamepadMapping = Record<string, GamepadBinding>;
export type GamepadState = Record<string, boolean | number>;

class GamepadWrapper {
  private mapping: GamepadMapping;
  private index: number;

  constructor(mapping: GamepadMapping = {}, index = 0) {
    this.mapping = mapping;
    this.index = index;
  }

  setMapping(mapping: GamepadMapping): void {
    this.mapping = mapping;
  }

  getState(): GamepadState {
    const pad = navigator.getGamepads ? navigator.getGamepads()[this.index] : null;
    const state: GamepadState = {};
    Object.keys(this.mapping).forEach((k) => (state[k] = false));
    if (!pad) return state;

    for (const [action, bind] of Object.entries(this.mapping)) {
      if (typeof bind === 'number') {
        state[action] = !!pad.buttons?.[bind]?.pressed;
      } else {
        const val = pad.axes?.[bind.axis] ?? 0;
        const dir = bind.dir ?? 1;
        const thr = bind.threshold ?? 0.2;
        const scaled = val * dir;
        state[action] = Math.abs(scaled) > thr ? scaled : 0;
      }
    }
    return state;
  }
}

export const useGamepad = (mapping: GamepadMapping, index = 0) => {
  const wrapperRef = useRef(new GamepadWrapper(mapping, index));
  const stateRef = useRef<GamepadState>({});

  useEffect(() => {
    wrapperRef.current.setMapping(mapping);
  }, [mapping]);

  useEffect(() => {
    let raf: number;
    const loop = () => {
      stateRef.current = wrapperRef.current.getState();
      raf = requestAnimationFrame(loop);
    };
    loop();
    return () => cancelAnimationFrame(raf);
  }, []);

  return stateRef;
};

export default useGamepad;
