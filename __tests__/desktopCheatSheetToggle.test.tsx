import { Desktop } from '../components/screen/desktop';

describe('Desktop cheat sheet toggle', () => {
  const createEvent = (overrides: Partial<KeyboardEvent> & { key: string }) => ({
    key: overrides.key,
    altKey: false,
    ctrlKey: false,
    metaKey: false,
    shiftKey: false,
    preventDefault: jest.fn(),
    stopPropagation: jest.fn(),
    target: document.createElement('div'),
    ...overrides,
  });

  const createDesktop = () => {
    const desktop = new Desktop();
    jest.spyOn(desktop, 'setState').mockImplementation(function (update) {
      const nextState =
        typeof update === 'function' ? update(desktop.state, desktop.props) : update;
      if (nextState) {
        desktop.state = { ...desktop.state, ...nextState };
      }
    });
    return desktop;
  };

  afterEach(() => {
    window.localStorage.clear();
    jest.restoreAllMocks();
  });

  test('opens the cheat sheet when the toggle shortcut is pressed', () => {
    const desktop = createDesktop();
    const event = createEvent({ key: '?', shiftKey: true });

    desktop.handleGlobalShortcut(event as unknown as KeyboardEvent);

    expect(desktop.state.showCheatSheet).toBe(true);
    expect(event.preventDefault).toHaveBeenCalled();
  });

  test('ignores the toggle shortcut when focus is on an input element', () => {
    const desktop = createDesktop();
    const input = document.createElement('input');
    const event = createEvent({ key: '?', shiftKey: true, target: input });

    desktop.handleGlobalShortcut(event as unknown as KeyboardEvent);

    expect(desktop.state.showCheatSheet).toBe(false);
    expect(event.preventDefault).not.toHaveBeenCalled();
  });

  test('closes the cheat sheet on Escape', () => {
    const desktop = createDesktop();
    desktop.setState({ showCheatSheet: true });
    const event = createEvent({ key: 'Escape' });

    desktop.handleGlobalShortcut(event as unknown as KeyboardEvent);

    expect(desktop.state.showCheatSheet).toBe(false);
    expect(event.preventDefault).toHaveBeenCalled();
  });

  test('respects persisted keymap overrides', () => {
    window.localStorage.setItem(
      'keymap',
      JSON.stringify({ 'Show keyboard shortcuts': 'Ctrl+Shift+K' }),
    );
    const desktop = createDesktop();
    const event = createEvent({ key: 'k', ctrlKey: true, shiftKey: true });

    desktop.handleGlobalShortcut(event as unknown as KeyboardEvent);

    expect(desktop.state.showCheatSheet).toBe(true);
    expect(event.preventDefault).toHaveBeenCalled();
  });
});
