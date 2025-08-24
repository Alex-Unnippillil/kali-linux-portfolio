export class InputManager {
  private keys = new Set<string>();
  private mouseButtons = new Set<number>();
  private mousePos = { x: 0, y: 0 };
  private touches = new Map<number, { x: number; y: number }>();

  constructor(private target: Window | HTMLElement = window) {
    this.target.addEventListener('keydown', this.onKeyDown);
    this.target.addEventListener('keyup', this.onKeyUp);
    this.target.addEventListener('mousedown', this.onMouseDown);
    this.target.addEventListener('mouseup', this.onMouseUp);
    this.target.addEventListener('mousemove', this.onMouseMove);
    this.target.addEventListener('touchstart', this.onTouchStart, { passive: false });
    this.target.addEventListener('touchmove', this.onTouchMove, { passive: false });
    this.target.addEventListener('touchend', this.onTouchEnd);
  }

  private onKeyDown = (e: KeyboardEvent) => this.keys.add(e.code);
  private onKeyUp = (e: KeyboardEvent) => this.keys.delete(e.code);
  private onMouseDown = (e: MouseEvent) => this.mouseButtons.add(e.button);
  private onMouseUp = (e: MouseEvent) => this.mouseButtons.delete(e.button);
  private onMouseMove = (e: MouseEvent) => {
    this.mousePos.x = e.clientX;
    this.mousePos.y = e.clientY;
  };
  private onTouchStart = (e: TouchEvent) => {
    for (const t of Array.from(e.changedTouches)) {
      this.touches.set(t.identifier, { x: t.clientX, y: t.clientY });
    }
  };
  private onTouchMove = (e: TouchEvent) => {
    for (const t of Array.from(e.changedTouches)) {
      this.touches.set(t.identifier, { x: t.clientX, y: t.clientY });
    }
  };
  private onTouchEnd = (e: TouchEvent) => {
    for (const t of Array.from(e.changedTouches)) {
      this.touches.delete(t.identifier);
    }
  };

  isKeyDown(code: string) {
    return this.keys.has(code);
  }

  isMouseDown(button: number) {
    return this.mouseButtons.has(button);
  }

  getMousePosition() {
    return { ...this.mousePos };
  }

  getTouches() {
    return Array.from(this.touches.values());
  }

  pollGamepads() {
    return navigator.getGamepads ? Array.from(navigator.getGamepads()).filter(Boolean) as Gamepad[] : [];
  }

  dispose() {
    this.target.removeEventListener('keydown', this.onKeyDown);
    this.target.removeEventListener('keyup', this.onKeyUp);
    this.target.removeEventListener('mousedown', this.onMouseDown);
    this.target.removeEventListener('mouseup', this.onMouseUp);
    this.target.removeEventListener('mousemove', this.onMouseMove);
    this.target.removeEventListener('touchstart', this.onTouchStart);
    this.target.removeEventListener('touchmove', this.onTouchMove);
    this.target.removeEventListener('touchend', this.onTouchEnd);
  }
}
