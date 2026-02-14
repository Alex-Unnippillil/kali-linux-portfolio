import { KeybindingManager, WindowState } from '../../src/wm/keybindingManager';

describe('KeybindingManager keyboard resizing', () => {
  const viewport = { width: 1024, height: 768 };

  const createState = (overrides: Partial<WindowState> = {}): WindowState => ({
    left: 100,
    top: 80,
    width: 320,
    height: 240,
    ...overrides,
  });

  const createEvent = (key: string, extras: Record<string, unknown> = {}) => ({
    key,
    altKey: true,
    ...extras,
  });

  it('resizes from the nearest horizontal edge when pressing Alt+Arrow', () => {
    const manager = new KeybindingManager({ viewport, step: 16 });
    const state = createState({ left: 40, width: 300 });

    const growResult = manager.handle(createEvent('ArrowLeft'), state);

    expect(growResult.handled).toBe(true);
    expect(growResult.state.left).toBe(24);
    expect(growResult.state.width).toBe(316);
    expect(growResult.state.keyboardResize?.edge).toBe('left');
    expect(growResult.state.keyboardResizeAxis).toBe('horizontal');
    expect(growResult.state.keyboardResizeAnnouncement).toContain('Left edge');

    const shrinkResult = manager.handle(createEvent('ArrowRight'), growResult.state);

    expect(shrinkResult.state.left).toBe(40);
    expect(shrinkResult.state.width).toBe(300);
    expect(shrinkResult.state.keyboardResize?.edge).toBe('left');
    expect(shrinkResult.announcement).toContain('Left edge');
  });

  it('selects the nearer right edge when window is docked to the right', () => {
    const manager = new KeybindingManager({ viewport, step: 16 });
    const state = createState({ left: 700, width: 240 });

    const result = manager.handle(createEvent('ArrowLeft'), state);

    expect(result.handled).toBe(true);
    expect(result.state.left).toBe(700);
    expect(result.state.width).toBe(224);
    expect(result.state.keyboardResize?.edge).toBe('right');
    expect(result.state.keyboardResizeAxis).toBe('horizontal');
    expect(result.announcement).toContain('Right edge');
  });

  it('resizes vertically from the closest edge', () => {
    const manager = new KeybindingManager({ viewport, step: 12 });
    const state = createState({ top: 460, height: 220 });

    const resultUp = manager.handle(createEvent('ArrowUp'), state);

    expect(resultUp.state.top).toBe(460);
    expect(resultUp.state.height).toBe(208);
    expect(resultUp.state.keyboardResize?.edge).toBe('bottom');
    expect(resultUp.state.keyboardResizeAxis).toBe('vertical');
    expect(resultUp.announcement).toContain('Bottom edge');

    const resultDown = manager.handle(createEvent('ArrowDown'), resultUp.state);

    expect(resultDown.state.height).toBe(220);
    expect(resultDown.state.keyboardResize?.edge).toBe('bottom');
  });

  it('announces when the resize hits a minimum limit', () => {
    const manager = new KeybindingManager({ viewport, minWidth: 160, step: 20 });
    const state = createState({ left: 120, width: 160 });

    const result = manager.handle(createEvent('ArrowRight'), state);

    expect(result.state.width).toBe(160);
    expect(result.state.left).toBe(120);
    expect(result.announcement).toContain('limit reached');
  });

  it('invokes announce callback with the computed message', () => {
    const announce = jest.fn();
    const manager = new KeybindingManager({ viewport, announce });
    const state = createState({ left: 50, width: 260 });

    const result = manager.handle(createEvent('ArrowLeft'), state);

    expect(announce).toHaveBeenCalledWith(result.announcement);
  });

  it('ignores alt+arrow combos with control modifiers', () => {
    const manager = new KeybindingManager({ viewport });
    const state = createState();

    const result = manager.handle(createEvent('ArrowLeft', { ctrlKey: true }), state);

    expect(result.handled).toBe(false);
    expect(result.state).toBe(state);
  });
});
