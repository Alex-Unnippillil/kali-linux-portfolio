import type { TwinStickState } from '@/utils';

let gamepad: any;
let pollTwinStick: (deadzone?: number) => TwinStickState;
let rafCallback: FrameRequestCallback | null;

beforeEach(() => {
  jest.resetModules();
  rafCallback = null;
  global.requestAnimationFrame = (cb: FrameRequestCallback) => {
    rafCallback = cb;
    return 1;
  };
  global.cancelAnimationFrame = jest.fn();
  ({ gamepad, pollTwinStick } = require('@/utils'));
  (navigator as any).getGamepads = jest.fn(() => []);
});

describe('GamepadManager', () => {
  test('emits button event and triggers vibration on new press', () => {
    const pad: any = {
      index: 0,
      buttons: [{ value: 0.8, pressed: true }],
      axes: [],
      vibrationActuator: { playEffect: jest.fn() },
    };
    (navigator as any).getGamepads = () => [pad];

    const listener = jest.fn();
    gamepad.on('button', listener);
    gamepad.start();
    gamepad.stop();

    expect(listener).toHaveBeenCalledWith({
      gamepad: pad,
      index: 0,
      value: 0.8,
      pressed: true,
    });
    expect(pad.vibrationActuator.playEffect).toHaveBeenCalled();
  });

  test('emits axis events only when value passes deadzone', () => {
    const pad: any = { index: 0, buttons: [], axes: [0.05] };
    (navigator as any).getGamepads = () => [pad];

    const listener = jest.fn();
    gamepad.on('axis', listener);
    gamepad.start();
    expect(listener).not.toHaveBeenCalled();

    pad.axes[0] = 0.2;
    rafCallback && rafCallback();
    gamepad.stop();

    expect(listener).toHaveBeenCalledWith({ gamepad: pad, index: 0, value: 0.2 });
  });
});

describe('pollTwinStick', () => {
  test('returns state for first gamepad respecting deadzone and fire button', () => {
    const pad1: any = { axes: [0.3, 0.1, 0.2, 0.6], buttons: [{ pressed: true }] };
    const pad2: any = { axes: [1, 1, 1, 1], buttons: [] };
    (navigator as any).getGamepads = () => [pad1, pad2];

    const state = pollTwinStick();
    expect(state).toEqual({ moveX: 0.3, moveY: 0, aimX: 0, aimY: 0.6, fire: true });
  });
});
