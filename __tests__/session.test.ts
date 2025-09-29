import { sanitizeDesktopSession, sanitizeSessionWindow, SESSION_VERSION } from '../hooks/useSession';
import { defaults } from '../utils/settingsStore';

describe('session persistence sanitizers', () => {
  it('fills defaults for legacy window entries', () => {
    const legacy = {
      windows: [
        { id: 'terminal', x: 42 },
        { id: 'files', y: 120, minimized: true },
      ],
    };

    const session = sanitizeDesktopSession(legacy);

    expect(session.version).toBe(SESSION_VERSION);
    expect(session.wallpaper).toBe(defaults.wallpaper);
    expect(session.dock).toEqual([]);
    expect(session.windows).toHaveLength(2);
    expect(session.windows[0]).toMatchObject({
      id: 'terminal',
      x: 42,
      y: expect.any(Number),
      width: expect.any(Number),
      height: expect.any(Number),
      minimized: false,
      order: 0,
    });
    expect(session.windows[1]).toMatchObject({
      id: 'files',
      minimized: true,
      order: 1,
    });
  });

  it('drops invalid windows and preserves explicit ordering', () => {
    const dirty = {
      wallpaper: 'custom.png',
      dock: ['about-alex', 123],
      windows: [
        { id: 12, x: 10, y: 10 },
        { id: 'valid', x: 1, y: 2, order: 5, workspace: 3 },
        { id: 'another', x: 3, y: 4, order: 2 },
      ],
    };

    const session = sanitizeDesktopSession(dirty);

    expect(session.windows).toHaveLength(2);
    expect(session.windows[0]).toMatchObject({ id: 'another', order: 0, workspace: 0 });
    expect(session.windows[1]).toMatchObject({ id: 'valid', order: 1, workspace: 3 });
    expect(session.dock).toEqual(['about-alex']);
    expect(session.wallpaper).toBe('custom.png');
  });

  it('sanitizes individual windows independently', () => {
    const windowState = sanitizeSessionWindow({
      id: 'viewer',
      x: '12',
      y: 200,
      width: 75,
      height: 60,
      snapped: 'invalid',
      minimized: 'yes',
      context: { path: '/tmp' },
    });

    expect(windowState).toMatchObject({
      id: 'viewer',
      x: 60,
      y: 200,
      width: 75,
      height: 60,
      minimized: false,
      snapped: null,
      context: { path: '/tmp' },
    });
  });
});

