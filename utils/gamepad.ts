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
const MAP_PREFIX = 'gamepad-action-map-';

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
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(CAL_PREFIX + id);
    return raw ? (JSON.parse(raw) as CalibrationData) : null;
  } catch {
    return null;
  }
}

export function saveCalibration(id: string, data: CalibrationData) {
  if (typeof window === 'undefined') return;
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

export type AxisDirection = 'positive' | 'negative';

export interface AxisBinding {
  index: number;
  deadzone?: number;
  invert?: boolean;
  scale?: number;
}

export interface AxisToButtonBinding {
  axis: number;
  direction: AxisDirection;
  threshold?: number;
  deadzone?: number;
  invert?: boolean;
}

export interface ButtonBindingObject {
  index: number;
  threshold?: number;
}

export type ButtonBinding =
  | number
  | ButtonBindingObject
  | AxisToButtonBinding
  | Array<number | ButtonBindingObject | AxisToButtonBinding>;

export interface GamepadActionMap {
  buttons?: Record<string, ButtonBinding>;
  axes?: Record<string, AxisBinding>;
}

export interface GamepadActionState {
  connected: boolean;
  buttons: Record<string, boolean>;
  axes: Record<string, number>;
  raw: Gamepad | null;
}

export interface ActionMapOptions {
  label?: string;
  persist?: boolean;
  deadzone?: number;
}

export interface RegisteredActionMap {
  defaults: GamepadActionMap;
  overrides?: GamepadActionMap;
  map: GamepadActionMap;
  options: Required<ActionMapOptions>;
}

export type GamepadEventMap = {
  connected: Gamepad;
  disconnected: Gamepad;
  button: ButtonEvent;
  axis: AxisEvent;
  mapchange: { gameId: string; map: GamepadActionMap; label?: string };
};

type Listener<T> = (event: T) => void;

class GamepadManager {
  private listeners: Record<keyof GamepadEventMap, Set<Listener<any>>> = {
    connected: new Set(),
    disconnected: new Set(),
    button: new Set(),
    axis: new Set(),
    mapchange: new Set(),
  };
  private prevState = new Map<number, { buttons: number[]; axes: number[] }>();

  private raf: number | null = null;
  private deadzone: number;
  private actionMaps = new Map<string, RegisteredActionMap>();
  private actionSubscribers = new Map<string, Set<Listener<GamepadActionState>>>();
  private actionStateCache = new Map<string, GamepadActionState>();

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
    let primary: Gamepad | null = null;
    for (const pad of pads) {
      if (!pad) continue;
      if (!primary) primary = pad;

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

    this.updateActionStates(primary);
    this.raf = requestAnimationFrame(this.poll);
  };

  private updateActionStates(pad: Gamepad | null) {
    this.actionMaps.forEach((entry, gameId) => {
      const next = this.computeActionState(entry, pad);
      const prev = this.actionStateCache.get(gameId);
      if (!prev || !this.areStatesEqual(prev, next)) {
        this.actionStateCache.set(gameId, next);
        const subs = this.actionSubscribers.get(gameId);
        subs?.forEach((fn) => fn(next));
      }
    });
  }

  private areStatesEqual(a: GamepadActionState, b: GamepadActionState) {
    if (a.connected !== b.connected) return false;
    const aButtons = Object.keys(a.buttons);
    const bButtons = Object.keys(b.buttons);
    if (aButtons.length !== bButtons.length) return false;
    for (const key of aButtons) {
      if (a.buttons[key] !== b.buttons[key]) return false;
    }
    const aAxes = Object.keys(a.axes);
    const bAxes = Object.keys(b.axes);
    if (aAxes.length !== bAxes.length) return false;
    for (const key of aAxes) {
      if (Math.abs(a.axes[key] - b.axes[key]) > 1e-3) return false;
    }
    return true;
  }

  private computeActionState(entry: RegisteredActionMap, pad: Gamepad | null): GamepadActionState {
    const ranges = pad ? loadCalibration(pad.id)?.axes || [] : [];
    const buttons: Record<string, boolean> = {};
    const axes: Record<string, number> = {};

    const map = entry.map;

    const resolveAxisValue = (binding: AxisBinding | AxisToButtonBinding, axisValue?: number) => {
      if (!pad) return 0;
      const idx = 'index' in binding ? binding.index : binding.axis;
      const raw = typeof axisValue === 'number' ? axisValue : pad.axes[idx] ?? 0;
      const calibrated = applyCalibration(raw, ranges[idx]);
      const deadzone = binding.deadzone ?? entry.options.deadzone ?? this.deadzone;
      const value = Math.abs(calibrated) < deadzone ? 0 : calibrated;
      const scaled = binding.invert ? -value : value;
      return binding.scale ? scaled * binding.scale : scaled;
    };

    if (map.axes) {
      Object.entries(map.axes).forEach(([action, binding]) => {
        const value = resolveAxisValue(binding as AxisBinding);
        axes[action] = value;
      });
    }

    if (map.buttons) {
      Object.entries(map.buttons).forEach(([action, binding]) => {
        const normalized = Array.isArray(binding) ? binding : [binding];
        buttons[action] = normalized.some((b) => {
          if (typeof b === 'number') {
            return pad ? pad.buttons[b]?.pressed ?? false : false;
          }
          if ('index' in b) {
            const threshold = b.threshold ?? 0.5;
            return pad ? (pad.buttons[b.index]?.value ?? 0) >= threshold : false;
          }
          const value = resolveAxisValue(b);
          const threshold = b.threshold ?? 0.5;
          return b.direction === 'positive' ? value >= threshold : value <= -threshold;
        });
      });
    }

    return {
      connected: Boolean(pad),
      buttons,
      axes,
      raw: pad ?? null,
    };
  }

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

  private mergeMaps(base: GamepadActionMap, overrides?: GamepadActionMap): GamepadActionMap {
    if (!overrides) return cloneMap(base);
    const merged: GamepadActionMap = {
      buttons: { ...(base.buttons ?? {}) },
      axes: { ...(base.axes ?? {}) },
    };
    if (overrides.buttons) {
      Object.entries(overrides.buttons).forEach(([key, value]) => {
        (merged.buttons as Record<string, ButtonBinding>)[key] = value;
      });
    }
    if (overrides.axes) {
      Object.entries(overrides.axes).forEach(([key, value]) => {
        (merged.axes as Record<string, AxisBinding>)[key] = value;
      });
    }
    if (!Object.keys(merged.buttons as Record<string, ButtonBinding>).length) {
      delete merged.buttons;
    }
    if (!Object.keys(merged.axes as Record<string, AxisBinding>).length) {
      delete merged.axes;
    }
    return merged;
  }

  setActionMap(gameId: string, map: GamepadActionMap, options: ActionMapOptions = {}) {
    const existing = this.actionMaps.get(gameId);
    const defaults = map;
    const persist = options.persist ?? existing?.options.persist ?? false;
    const label = options.label ?? existing?.options.label ?? gameId;
    const deadzone = options.deadzone ?? existing?.options.deadzone ?? this.deadzone;

    let overrides = existing?.overrides;
    if (persist && typeof window !== 'undefined') {
      const stored = loadStoredActionMap(gameId);
      if (stored) overrides = stored;
    }

    const resolved = this.mergeMaps(defaults, overrides);
    const entry: RegisteredActionMap = {
      defaults: cloneMap(defaults),
      overrides: overrides ? cloneMap(overrides) : undefined,
      map: resolved,
      options: { persist, label, deadzone },
    };
    this.actionMaps.set(gameId, entry);
    this.emit('mapchange', { gameId, map: cloneMap(resolved), label });
    this.updateActionStates(null);
    this.start();
  }

  updateActionMap(gameId: string, overrides: GamepadActionMap, persist = true) {
    const entry = this.actionMaps.get(gameId);
    if (!entry) return;
    entry.overrides = cloneMap(overrides);
    entry.map = this.mergeMaps(entry.defaults, overrides);
    if (persist && entry.options.persist && typeof window !== 'undefined') {
      saveStoredActionMap(gameId, overrides);
    }
    this.actionMaps.set(gameId, entry);
    this.emit('mapchange', { gameId, map: cloneMap(entry.map), label: entry.options.label });
    this.updateActionStates(null);
  }

  resetActionMap(gameId: string) {
    const entry = this.actionMaps.get(gameId);
    if (!entry) return;
    entry.overrides = undefined;
    entry.map = cloneMap(entry.defaults);
    if (entry.options.persist && typeof window !== 'undefined') {
      clearStoredActionMap(gameId);
    }
    this.actionMaps.set(gameId, entry);
    this.emit('mapchange', { gameId, map: cloneMap(entry.map), label: entry.options.label });
    this.updateActionStates(null);
  }

  getActionMap(gameId: string): GamepadActionMap | undefined {
    return this.actionMaps.get(gameId)?.map ? cloneMap(this.actionMaps.get(gameId)!.map) : undefined;
  }

  getActionDefaults(gameId: string): GamepadActionMap | undefined {
    const entry = this.actionMaps.get(gameId);
    return entry ? cloneMap(entry.defaults) : undefined;
  }

  getActionState(gameId: string): GamepadActionState | undefined {
    const cached = this.actionStateCache.get(gameId);
    if (cached) return cached;
    const entry = this.actionMaps.get(gameId);
    if (!entry) return undefined;
    const state = this.computeActionState(entry, null);
    this.actionStateCache.set(gameId, state);
    return state;
  }

  subscribeToActions(gameId: string, fn: Listener<GamepadActionState>) {
    const subs = this.actionSubscribers.get(gameId) ?? new Set();
    subs.add(fn);
    this.actionSubscribers.set(gameId, subs);
    const cached = this.getActionState(gameId);
    if (cached) fn(cached);
    this.start();
    return () => {
      const current = this.actionSubscribers.get(gameId);
      current?.delete(fn);
      if (current && current.size === 0) {
        this.actionSubscribers.delete(gameId);
      }
    };
  }

  listActionMaps() {
    return Array.from(this.actionMaps.entries()).map(([id, entry]) => ({
      id,
      label: entry.options.label ?? id,
    }));
  }
}

export const gamepad = new GamepadManager();
export default gamepad;

function cloneMap(map: GamepadActionMap): GamepadActionMap {
  const clone: GamepadActionMap = {};
  if (map.buttons) {
    clone.buttons = { ...map.buttons };
  }
  if (map.axes) {
    clone.axes = { ...map.axes };
  }
  return clone;
}

function loadStoredActionMap(gameId: string): GamepadActionMap | undefined {
  if (typeof window === 'undefined') return undefined;
  try {
    const raw = window.localStorage.getItem(MAP_PREFIX + gameId);
    return raw ? (JSON.parse(raw) as GamepadActionMap) : undefined;
  } catch {
    return undefined;
  }
}

function saveStoredActionMap(gameId: string, map: GamepadActionMap) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(MAP_PREFIX + gameId, JSON.stringify(map));
  } catch {
    // ignore persistence errors
  }
}

function clearStoredActionMap(gameId: string) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(MAP_PREFIX + gameId);
  } catch {
    // ignore
  }
}

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

export function createTwinStickMap(deadzone = 0.25): GamepadActionMap {
  return {
    axes: {
      moveX: { index: 0, deadzone },
      moveY: { index: 1, deadzone },
      aimX: { index: 2, deadzone },
      aimY: { index: 3, deadzone },
    },
    buttons: {
      fire: [
        { index: 0, threshold: 0.5 },
        { index: 1, threshold: 0.5 },
        { index: 2, threshold: 0.5 },
        { index: 3, threshold: 0.5 },
        { index: 5, threshold: 0.5 },
      ],
    },
  };
}
