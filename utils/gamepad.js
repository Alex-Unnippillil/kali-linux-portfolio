export function pollTwinStick(deadzone = 0.25) {
  const state = { moveX: 0, moveY: 0, aimX: 0, aimY: 0, fire: false };
  const pads = navigator.getGamepads ? navigator.getGamepads() : [];
  for (const pad of pads) {
    if (!pad) continue;
    const [lx, ly, rx, ry] = pad.axes;
    state.moveX = Math.abs(lx) > deadzone ? lx : 0;
    state.moveY = Math.abs(ly) > deadzone ? ly : 0;
    state.aimX = Math.abs(rx) > deadzone ? rx : 0;
    state.aimY = Math.abs(ry) > deadzone ? ry : 0;
    state.fire = pad.buttons.some((b) => b.pressed);
    break;
  }
  return state;
}
