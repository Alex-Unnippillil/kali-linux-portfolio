import { keyDownToAction, keyUpToAction } from './keybinds';
import type { InputAction } from '../types';

export class InputController {
  private readonly onAction: (action: InputAction) => void;
  private readonly keyDown = (event: KeyboardEvent) => {
    const action = keyDownToAction(event.code);
    if (!action) return;
    if (event.code === 'Space' || event.code === 'Escape') event.preventDefault();
    this.onAction(action);
  };

  private readonly keyUp = (event: KeyboardEvent) => {
    const action = keyUpToAction(event.code);
    if (!action) return;
    this.onAction(action);
  };

  constructor(onAction: (action: InputAction) => void) {
    this.onAction = onAction;
  }

  attach() {
    window.addEventListener('keydown', this.keyDown);
    window.addEventListener('keyup', this.keyUp);
  }

  detach() {
    window.removeEventListener('keydown', this.keyDown);
    window.removeEventListener('keyup', this.keyUp);
  }
}
