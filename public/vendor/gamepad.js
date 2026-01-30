const CAL_PREFIX = 'gamepad-calibration-';
export const GAMEPAD_PRESETS = {
    Xbox: {
        vendor: 'Xbox',
        axes: Array.from({ length: 4 }, () => ({ min: -1, max: 1 })),
    },
    PlayStation: {
        vendor: 'PlayStation',
        axes: Array.from({ length: 4 }, () => ({ min: -1, max: 1 })),
    },
};
export function loadCalibration(id) {
    if (typeof window === 'undefined')
        return null;
    try {
        const raw = window.localStorage.getItem(CAL_PREFIX + id);
        return raw ? JSON.parse(raw) : null;
    }
    catch {
        return null;
    }
}
export function saveCalibration(id, data) {
    if (typeof window === 'undefined')
        return;
    try {
        window.localStorage.setItem(CAL_PREFIX + id, JSON.stringify(data));
    }
    catch {
        // ignore
    }
}
function applyCalibration(value, range) {
    if (!range)
        return value;
    const span = range.max - range.min;
    if (span === 0)
        return 0;
    const clamped = Math.min(Math.max(value, range.min), range.max);
    return ((clamped - range.min) / span) * 2 - 1;
}
class GamepadManager {
    constructor(deadzone = 0.1) {
        this.listeners = {
            connected: new Set(),
            disconnected: new Set(),
            button: new Set(),
            axis: new Set(),
        };
        this.prevState = new Map();
        this.raf = null;
        this.poll = () => {
            const pads = navigator.getGamepads ? navigator.getGamepads() : [];
            for (const pad of pads) {
                if (!pad)
                    continue;
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
                            }
                            catch {
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
        this.deadzone = deadzone;
        if (typeof window !== 'undefined') {
            window.addEventListener('gamepadconnected', (e) => this.emit('connected', e.gamepad));
            window.addEventListener('gamepaddisconnected', (e) => this.emit('disconnected', e.gamepad));
        }
    }
    on(type, fn) {
        this.listeners[type].add(fn);
    }
    off(type, fn) {
        this.listeners[type].delete(fn);
    }
    emit(type, event) {
        this.listeners[type].forEach((fn) => fn(event));
    }
    start() {
        if (this.raf !== null)
            return;
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
/**
 * Polls the first connected gamepad and returns a simplified twin stick state.
 * Left stick controls movement while the right stick controls aiming.
 * Any face button triggers the `fire` flag.
 */
export function pollTwinStick(deadzone = 0.25) {
    const state = { moveX: 0, moveY: 0, aimX: 0, aimY: 0, fire: false };
    const pads = navigator.getGamepads ? navigator.getGamepads() : [];
    for (const pad of pads) {
        if (!pad)
            continue;
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
