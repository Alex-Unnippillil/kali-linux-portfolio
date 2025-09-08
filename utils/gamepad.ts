import { isBrowser } from '@/utils/env';
export interface ButtonEvent {
  gamepad: Gamepad;
  index: number;
  value: number;
  pressed: boolean;
}

export interface AxisEvent {
  gamepad: Gamepad;
  index: number;
  value: number;
}

export interface AxisRange {
  min: number;
  max: number;
}

export interface CalibrationData {
  axes: AxisRange[];
  vendor?: string;
}

const CAL_PREFIX = 'gamepad-calibration-';

export const GAMEPAD_PRESETS: Record<string, CalibrationData> = {
  Xbox: {
    vendor: 'Xbox',
    axes: Array.from({ length: 4 }, () => ({ min: -1, max: 1 })),
  },
  PlayStation: {
    vendor: 'PlayStation',
    axes: Array.from({ length: 4 }, () => ({ min: -1, max: 1 })),
  },
};

export function loadCalibration(id: string): CalibrationData | null {
  if (!isBrowser()) return null;
  try {
    const raw = window.localStorage.getItem(CAL_PREFIX + id);
    return raw ? (JSON.parse(raw) as CalibrationData) : null;
  } catch {
    return null;
  }
}

export function saveCalibration(id: string, data: CalibrationData) {
  if (!isBrowser()) return;
  try {
    window.localStorage.setItem(CAL_PREFIX + id, JSON.stringify(data));
  } catch {
    // ignore
  }
}

function applyCalibration(value: number, range?: AxisRange) {
  if (!range) return value;
  const span = range.max - range.min;
  if (span === 0) return 0;
  const clamped = Math.min(Math.max(value, range.min), range.max);
  return ((clamped - range.min) / span) * 2 - 1;
}

export type GamepadEventMap = {
  connected: Gamepad;
  disconnected: Gamepad;
  button: ButtonEvent;
  axis: AxisEvent;
};

type Listener<T> = (event: T) => void;

class GamepadManager {
  private listeners: {
    [K in keyof GamepadEventMap]: Set<Listener<GamepadEventMap[K]>>;
  } = {
    connected: new Set(),
    disconnected: new Set(),
    button: new Set(),
    axis: new Set(),
  };
  private prevState = new Map<number, { buttons: number[]; axes: number[] }>();

  private raf: number | null = null;
  private deadzone: number;

  constructor(deadzone = 0.1) {
    this.deadzone = deadzone;

    if (isBrowser()) {
      window.addEventListener('gamepadconnected', (e) =>
        this.emit('connected', (e as GamepadEvent).gamepad)
      );
      window.addEventListener('gamepaddisconnected', (e) =>
        this.emit('disconnected', (e as GamepadEvent).gamepad)
      );
    }
  }

  on<K extends keyof GamepadEventMap>(type: K, fn: Listener<GamepadEventMap[K]>) {
    this.listeners[type].add(fn);
  }

  off<K extends keyof GamepadEventMap>(type: K, fn: Listener<GamepadEventMap[K]>) {
    this.listeners[type].delete(fn);
  }

  private emit<K extends keyof GamepadEventMap>(type: K, event: GamepadEventMap[K]) {
    this.listeners[type].forEach((fn) => fn(event));
  }

  private poll = () => {
    const pads = navigator.getGamepads ? navigator.getGamepads() : [];
    for (const pad of pads) {
      if (!pad) continue;

      const prev = this.prevState.get(pad.index) || { buttons: [], axes: [] };

      pad.buttons.forEach((b, i) => {
        const prevVal = prev.buttons[i] || 0;
        if (b.value !== prevVal) {
          const pressed = b.value > 0.5;
          const prevPressed = prevVal > 0.5;
          this.emit('button', { gamepad: pad, index: i, value: b.value, pressed });
          if (pressed && !prevPressed && pad.vibrationActuator?.playEffect) {
            try {
              pad.vibrationActuator.playEffect('dual-rumble', {
                duration: 30,
                strongMagnitude: 1.0,
                weakMagnitude: 1.0,
              });
            } catch {
              // ignore
            }
          }
        }
      });

      pad.axes.forEach((v, i) => {
        const prevVal = prev.axes[i] || 0;
        const nv = Math.abs(v) < this.deadzone ? 0 : v;
        const pv = Math.abs(prevVal) < this.deadzone ? 0 : prevVal;
        if (nv !== pv) {
          this.emit('axis', { gamepad: pad, index: i, value: nv });
        }
      });

      this.prevState.set(pad.index, {
        buttons: pad.buttons.map((b) => b.value),
        axes: Array.from(pad.axes),
      });
    }
    this.raf = requestAnimationFrame(this.poll);
  };

  start() {
    if (this.raf !== null) return;
    this.poll();
  }

  stop() {
    if (this.raf !== null) {
      cancelAnimationFrame(this.raf);
      this.raf = null;
    }
  }
}

export const gamepad = new GamepadManager();
export default gamepad;

export interface TwinStickState {
  moveX: number;
  moveY: number;
  aimX: number;
  aimY: number;
  fire: boolean;
}

/**
 * Polls the first connected gamepad and returns a simplified twin stick state.
 * Left stick controls movement while the right stick controls aiming.
 * Any face button triggers the `fire` flag.
 */
export function pollTwinStick(deadzone = 0.25): TwinStickState {
  const state: TwinStickState = { moveX: 0, moveY: 0, aimX: 0, aimY: 0, fire: false };
  const pads = navigator.getGamepads ? navigator.getGamepads() : [];
  for (const pad of pads) {
    if (!pad) continue;
    const calib = loadCalibration(pad.id);
    const ranges = calib?.axes || [];
    const [lx, ly, rx, ry] = pad.axes;
    const cx = applyCalibration(lx, ranges[0]);
    const cy = applyCalibration(ly, ranges[1]);
    const ax = applyCalibration(rx, ranges[2]);
    const ay = applyCalibration(ry, ranges[3]);
    state.moveX = Math.abs(cx) > deadzone ? cx : 0;
    state.moveY = Math.abs(cy) > deadzone ? cy : 0;
    state.aimX = Math.abs(ax) > deadzone ? ax : 0;
    state.aimY = Math.abs(ay) > deadzone ? ay : 0;
    state.fire = pad.buttons.some((b) => b.pressed);
    break; // only use first gamepad
  }
  return state;
}
