import type { TwinStickState } from '../utils/gamepad';

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
  ({ gamepad, pollTwinStick } = require('../utils/gamepad'));
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

  test('notifies subscribers with mapped action state', () => {
    const pad: any = {
      index: 0,
      buttons: [{ value: 0, pressed: false }],
      axes: [0],
    };
    (navigator as any).getGamepads = () => [pad];

    gamepad.setActionMap('test', {
      buttons: { fire: { index: 0, threshold: 0.5 } },
      axes: { moveX: { index: 0, deadzone: 0.1 } },
    });

    const listener = jest.fn();
    gamepad.subscribeToActions('test', listener);
    gamepad.start();

    pad.buttons[0].value = 0.7;
    pad.buttons[0].pressed = true;
    pad.axes[0] = 0.6;
    rafCallback && rafCallback();
    gamepad.stop();

    expect(listener).toHaveBeenLastCalledWith(
      expect.objectContaining({
        buttons: expect.objectContaining({ fire: true }),
        axes: expect.objectContaining({ moveX: 0.6 }),
      }),
    );
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
