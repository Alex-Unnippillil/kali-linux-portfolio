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
