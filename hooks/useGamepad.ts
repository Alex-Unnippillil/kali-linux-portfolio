import { useEffect, useMemo, useState } from 'react';
import gamepad, {
  createTwinStickMap,
  GamepadActionMap,
  GamepadActionState,
  TwinStickState,
  ActionMapOptions,
} from '../utils/gamepad';

export interface UseGamepadOptions extends ActionMapOptions {
  persist?: boolean;
}

const EMPTY_TWIN_STICK: TwinStickState = {
  moveX: 0,
  moveY: 0,
  aimX: 0,
  aimY: 0,
  fire: false,
};

const EMPTY_STATE: GamepadActionState = {
  connected: false,
  buttons: {},
  axes: {},
  raw: null,
};

function toTwinStick(state: GamepadActionState): TwinStickState {
  return {
    moveX: state.axes.moveX ?? 0,
    moveY: state.axes.moveY ?? 0,
    aimX: state.axes.aimX ?? 0,
    aimY: state.axes.aimY ?? 0,
    fire: state.buttons.fire ?? false,
  };
}

function ensureMap(
  gameId: string,
  map: GamepadActionMap,
  label: string | undefined,
  persist: boolean,
  deadzone: number | undefined,
) {
  gamepad.setActionMap(gameId, map, {
    label,
    persist,
    deadzone,
  });
}

export function useGamepadActions(
  gameId: string,
  map: GamepadActionMap,
  options: UseGamepadOptions = {},
): GamepadActionState {
  const persist = options.persist ?? true;
  const [state, setState] = useState<GamepadActionState>(() =>
    gamepad.getActionState(gameId) ?? EMPTY_STATE,
  );

  useEffect(() => {
    ensureMap(gameId, map, options.label, persist, options.deadzone);
    const unsubscribe = gamepad.subscribeToActions(gameId, setState);
    return () => {
      unsubscribe();
    };
  }, [gameId, map, options.label, persist, options.deadzone]);

  return state;
}

export default function useGamepad(
  gameId: string,
  options: UseGamepadOptions = {},
): TwinStickState {
  const deadzone = options.deadzone ?? 0.25;
  const persist = options.persist ?? true;
  const map = useMemo(() => createTwinStickMap(deadzone), [deadzone]);

  const [state, setState] = useState<TwinStickState>(() => {
    const snapshot = gamepad.getActionState(gameId);
    return snapshot ? toTwinStick(snapshot) : EMPTY_TWIN_STICK;
  });

  useEffect(() => {
    ensureMap(gameId, map, options.label, persist, options.deadzone);
    const unsubscribe = gamepad.subscribeToActions(gameId, (snapshot) => {
      setState(toTwinStick(snapshot));
    });
    return () => {
      unsubscribe();
    };
  }, [gameId, map, options.label, persist, options.deadzone]);

  return state;
}
