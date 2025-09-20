import keybindingManager, { normalizeCombo } from '../utils/keybindingManager';

describe('keybindingManager', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('normalizes Win prefix to meta', () => {
    expect(normalizeCombo('Win+ArrowLeft')).toBe('meta+arrowleft');
    expect(normalizeCombo('CMD+ArrowLeft')).toBe('meta+arrowleft');
  });

  it('invokes registered handlers', () => {
    const handler = jest.fn((event: KeyboardEvent) => event.preventDefault());
    const dispose = keybindingManager.register('Win+ArrowRight', handler);
    const event = new KeyboardEvent('keydown', { key: 'ArrowRight', metaKey: true });
    window.dispatchEvent(event);
    expect(handler).toHaveBeenCalledTimes(1);
    dispose();
  });

  it('stops invoking handlers after unregister', () => {
    const handler = jest.fn();
    const dispose = keybindingManager.register('Win+ArrowUp', handler);
    dispose();
    const event = new KeyboardEvent('keydown', { key: 'ArrowUp', metaKey: true });
    window.dispatchEvent(event);
    expect(handler).not.toHaveBeenCalled();
  });
});
