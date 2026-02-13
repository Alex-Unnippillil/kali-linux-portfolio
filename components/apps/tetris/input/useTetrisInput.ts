import { useCallback, useEffect, useMemo, useRef } from 'react';
import { consumeGameKey, shouldHandleGameKey } from '../../../../utils/gameInput';

export interface KeyBindings {
  left: string;
  right: string;
  softDrop: string;
  hardDrop: string;
  rotateCW: string;
  rotateCCW: string;
  rotate180: string;
  hold: string;
  pause: string;
  restart: string;
  help: string;
  settings: string;
}

export const DEFAULT_KEYS: KeyBindings = {
  left: 'ArrowLeft',
  right: 'ArrowRight',
  softDrop: 'ArrowDown',
  hardDrop: 'Space',
  rotateCW: 'ArrowUp',
  rotateCCW: 'KeyZ',
  rotate180: 'KeyA',
  hold: 'ShiftLeft',
  pause: 'KeyP',
  restart: 'KeyR',
  help: 'Slash',
  settings: 'KeyO',
};

export interface InputSettings {
  dasMs: number;
  arrMs: number;
}

export interface InputSnapshot {
  actions: string[];
  softDropActive: boolean;
}

export default function useTetrisInput(
  isFocused: boolean,
  keyBindings: KeyBindings,
  inputSettings: InputSettings,
) {
  const pressedRef = useRef<Record<string, boolean>>({});
  const firedRef = useRef<Record<string, boolean>>({});
  const horizontalRef = useRef<{ dir: -1 | 0 | 1; startAt: number; lastAt: number }>({
    dir: 0,
    startAt: 0,
    lastAt: 0,
  });
  const queuedRef = useRef<string[]>([]);

  const codeToAction = useMemo(
    () => ({
      [keyBindings.rotateCW]: 'rotateCW',
      [keyBindings.rotateCCW]: 'rotateCCW',
      [keyBindings.rotate180]: 'rotate180',
      [keyBindings.hardDrop]: 'hardDrop',
      [keyBindings.hold]: 'hold',
      [keyBindings.pause]: 'togglePause',
      [keyBindings.restart]: 'restart',
      [keyBindings.help]: 'toggleHelp',
      [keyBindings.settings]: 'toggleSettings',
    }),
    [keyBindings],
  );

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (!shouldHandleGameKey(event, { isFocused })) return;
      const action = codeToAction[event.code];
      if (action) {
        consumeGameKey(event);
        if (!firedRef.current[event.code]) {
          queuedRef.current.push(action);
          firedRef.current[event.code] = true;
        }
      }

      if (event.code === keyBindings.left || event.code === keyBindings.right || event.code === keyBindings.softDrop) {
        consumeGameKey(event);
        pressedRef.current[event.code] = true;
      }
    };

    const onKeyUp = (event: KeyboardEvent) => {
      pressedRef.current[event.code] = false;
      firedRef.current[event.code] = false;
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);

    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, [codeToAction, isFocused, keyBindings.left, keyBindings.right, keyBindings.softDrop]);

  const consume = useCallback((nowMs: number): InputSnapshot => {
    const actions = [...queuedRef.current];
    queuedRef.current = [];

    const left = !!pressedRef.current[keyBindings.left];
    const right = !!pressedRef.current[keyBindings.right];
    const softDropActive = !!pressedRef.current[keyBindings.softDrop];

    const dir: -1 | 0 | 1 = left === right ? 0 : left ? -1 : 1;
    const horizontal = horizontalRef.current;

    if (dir === 0) {
      horizontal.dir = 0;
      horizontal.startAt = nowMs;
      horizontal.lastAt = nowMs;
    } else if (horizontal.dir !== dir) {
      horizontal.dir = dir;
      horizontal.startAt = nowMs;
      horizontal.lastAt = nowMs;
      actions.push(dir === -1 ? 'moveLeft' : 'moveRight');
    } else {
      const dasElapsed = nowMs - horizontal.startAt;
      if (dasElapsed >= inputSettings.dasMs) {
        if (inputSettings.arrMs <= 0 || nowMs - horizontal.lastAt >= inputSettings.arrMs) {
          actions.push(dir === -1 ? 'moveLeft' : 'moveRight');
          horizontal.lastAt = nowMs;
        }
      }
    }

    return { actions, softDropActive };
  }, [inputSettings.arrMs, inputSettings.dasMs, keyBindings.left, keyBindings.right, keyBindings.softDrop]);

  return useMemo(() => ({ consume }), [consume]);
}
