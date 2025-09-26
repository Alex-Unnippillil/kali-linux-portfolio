import { DEFAULT_WINDOW_PREFERENCES } from '../utils/windowStateStore';

describe('windowStateStore', () => {
  beforeEach(() => {
    localStorage.clear();
    jest.resetModules();
  });

  it('persists preferences to localStorage', async () => {
    const {
      getWindowPreferences,
      setWindowPreferences,
    } = await import('../utils/windowStateStore');

    expect(getWindowPreferences('terminal')).toEqual(DEFAULT_WINDOW_PREFERENCES);

    setWindowPreferences('terminal', { alwaysOnTop: true, workspaceId: 2 });

    expect(getWindowPreferences('terminal')).toEqual({
      alwaysOnTop: true,
      workspaceId: 2,
    });

    const stored = localStorage.getItem('window-preferences');
    expect(stored).not.toBeNull();
    expect(JSON.parse(stored!)).toEqual({
      terminal: { alwaysOnTop: true, workspaceId: 2 },
    });
  });

  it('rehydrates state from storage on new import', async () => {
    localStorage.setItem(
      'window-preferences',
      JSON.stringify({
        browser: { alwaysOnTop: true, workspaceId: 1 },
      }),
    );

    const { getWindowPreferences } = await import('../utils/windowStateStore');

    expect(getWindowPreferences('browser')).toEqual({
      alwaysOnTop: true,
      workspaceId: 1,
    });
  });

  it('notifies subscribers when state changes', async () => {
    const {
      subscribeToWindowPreferences,
      setWindowPreferences,
    } = await import('../utils/windowStateStore');

    const listener = jest.fn();
    const unsubscribe = subscribeToWindowPreferences(listener);

    expect(listener).toHaveBeenCalledTimes(1);
    listener.mockClear();

    setWindowPreferences('files', { alwaysOnTop: true });
    expect(listener).toHaveBeenCalledWith(
      expect.objectContaining({
        files: { alwaysOnTop: true, workspaceId: null },
      }),
    );

    unsubscribe();
    listener.mockClear();

    setWindowPreferences('files', { alwaysOnTop: false });
    expect(listener).not.toHaveBeenCalled();
  });
});
