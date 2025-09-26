import {
  readWindowLayout,
  writeWindowLayout,
  clearWindowLayout,
  WINDOW_LAYOUT_VERSION,
  WINDOW_LAYOUT_STORAGE_KEY,
} from '../utils/windowLayoutStore';

describe('windowLayoutStore', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('serializes and restores window layouts', () => {
    writeWindowLayout({
      version: WINDOW_LAYOUT_VERSION,
      activeWorkspace: 2,
      windows: [
        {
          id: 'terminal',
          workspace: 1,
          position: { x: 120, y: 240 },
          size: { width: 75, height: 65 },
          zIndex: 4,
          minimized: false,
          focused: true,
        },
      ],
    });

    const layout = readWindowLayout();
    expect(layout).not.toBeNull();
    expect(layout?.activeWorkspace).toBe(2);
    expect(layout?.windows).toHaveLength(1);
    expect(layout?.windows[0]).toEqual({
      id: 'terminal',
      workspace: 1,
      position: { x: 120, y: 240 },
      size: { width: 75, height: 65 },
      zIndex: 4,
      minimized: false,
      focused: true,
    });
  });

  it('drops incompatible layouts and clears storage', () => {
    localStorage.setItem(
      WINDOW_LAYOUT_STORAGE_KEY,
      JSON.stringify({ version: 0, activeWorkspace: 0, windows: [] }),
    );

    expect(readWindowLayout()).toBeNull();
    expect(localStorage.getItem(WINDOW_LAYOUT_STORAGE_KEY)).toBeNull();
  });

  it('filters invalid window entries when hydrating', () => {
    localStorage.setItem(
      WINDOW_LAYOUT_STORAGE_KEY,
      JSON.stringify({
        version: WINDOW_LAYOUT_VERSION,
        activeWorkspace: 1,
        windows: [
          {
            id: 'valid-window',
            workspace: 3,
            position: { x: 10, y: 20 },
            size: { width: 55, height: 45 },
            zIndex: 2,
            minimized: true,
            focused: false,
          },
          {
            id: '',
            workspace: 1,
            position: { x: 'bad', y: 0 },
            size: { width: 0, height: 0 },
            zIndex: 1,
            minimized: false,
            focused: false,
          },
        ],
      }),
    );

    const layout = readWindowLayout();
    expect(layout).not.toBeNull();
    expect(layout?.windows).toHaveLength(1);
    expect(layout?.windows[0].id).toBe('valid-window');
    expect(layout?.windows[0].workspace).toBe(3);
  });

  it('clears stored layout when explicitly requested', () => {
    writeWindowLayout({
      version: WINDOW_LAYOUT_VERSION,
      activeWorkspace: 0,
      windows: [
        {
          id: 'about-alex',
          workspace: 0,
          position: { x: 0, y: 0 },
          size: { width: 60, height: 85 },
          zIndex: 1,
          minimized: false,
          focused: true,
        },
      ],
    });
    expect(localStorage.getItem(WINDOW_LAYOUT_STORAGE_KEY)).not.toBeNull();

    clearWindowLayout();
    expect(localStorage.getItem(WINDOW_LAYOUT_STORAGE_KEY)).toBeNull();
  });
});
