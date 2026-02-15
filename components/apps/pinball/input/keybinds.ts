import type { InputAction } from '../types';

export const keyDownToAction = (code: string): InputAction | null => {
  switch (code) {
    case 'KeyZ':
    case 'ShiftLeft':
      return 'flipper_left_down';
    case 'Slash':
    case 'ShiftRight':
      return 'flipper_right_down';
    case 'Space':
      return 'plunger_down';
    case 'Escape':
      return 'pause_toggle';
    case 'ArrowLeft':
      return 'nudge_left';
    case 'ArrowRight':
      return 'nudge_right';
    case 'ArrowUp':
    case 'KeyN':
      return 'nudge_up';
    default:
      return null;
  }
};

export const keyUpToAction = (code: string): InputAction | null => {
  switch (code) {
    case 'KeyZ':
    case 'ShiftLeft':
      return 'flipper_left_up';
    case 'Slash':
    case 'ShiftRight':
      return 'flipper_right_up';
    case 'Space':
      return 'plunger_up';
    default:
      return null;
  }
};
