export type KeyComboHandler = (event: KeyboardEvent) => void;

class KeybindingManager {
  private bindings = new Map<string, Set<KeyComboHandler>>();
  private initialized = false;

  init(): void {
    if (this.initialized || typeof window === 'undefined') return;
    window.addEventListener('keydown', this.handleKeyDown);
    this.initialized = true;
  }

  register(combo: string, handler: KeyComboHandler): void {
    if (!this.bindings.has(combo)) {
      this.bindings.set(combo, new Set());
    }
    this.bindings.get(combo)!.add(handler);
  }

  unregister(combo: string, handler: KeyComboHandler): void {
    const handlers = this.bindings.get(combo);
    if (handlers) {
      handlers.delete(handler);
      if (handlers.size === 0) this.bindings.delete(combo);
    }
  }

  private handleKeyDown = (event: KeyboardEvent): void => {
    const comboParts: string[] = [];
    if (event.altKey) comboParts.push('Alt');
    if (event.ctrlKey) comboParts.push('Ctrl');
    if (event.metaKey) comboParts.push('Meta');
    if (event.shiftKey) comboParts.push('Shift');
    comboParts.push(event.key);
    const combo = comboParts.join('+');
    const handlers = this.bindings.get(combo);
    if (handlers && handlers.size > 0) {
      event.preventDefault();
      handlers.forEach((cb) => cb(event));
    }
  };
}

const keybindingManager = new KeybindingManager();
export default keybindingManager;
