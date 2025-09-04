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

export type GamepadEventMap = {
  connected: Gamepad;
  disconnected: Gamepad;
  button: ButtonEvent;
  axis: AxisEvent;
};

type Listener<T> = (event: T) => void;

class GamepadManager {
  private listeners: Record<keyof GamepadEventMap, Set<Listener<any>>> = {
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

    if (typeof window !== 'undefined') {
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
    const [lx, ly, rx, ry] = pad.axes;
    state.moveX = Math.abs(lx) > deadzone ? lx : 0;
    state.moveY = Math.abs(ly) > deadzone ? ly : 0;
    state.aimX = Math.abs(rx) > deadzone ? rx : 0;
    state.aimY = Math.abs(ry) > deadzone ? ry : 0;
    state.fire = pad.buttons.some((b) => b.pressed);
    break; // only use first gamepad
  }
  return state;
}
