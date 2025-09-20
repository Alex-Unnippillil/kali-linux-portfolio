import type { SessionRecord } from '../modules/system/sessionManager';

const importManager = async () => {
  jest.resetModules();
  return import('../modules/system/sessionManager');
};

describe('sessionManager', () => {
  beforeEach(() => {
    localStorage.clear();
    delete process.env.NEXT_PUBLIC_ENABLE_USER_SWITCHER;
  });

  test('respects admin policy flag', async () => {
    process.env.NEXT_PUBLIC_ENABLE_USER_SWITCHER = 'disabled';
    const manager = await importManager();
    expect(manager.isUserSwitcherEnabled()).toBe(false);
    manager.__resetSessionManagerForTests();
  });

  test('switches between cached sessions and persists state', async () => {
    process.env.NEXT_PUBLIC_ENABLE_USER_SWITCHER = 'enabled';
    const manager = await importManager();
    manager.__resetSessionManagerForTests();

    let snapshot = manager.getSnapshot();
    expect(snapshot.sessions.length).toBeGreaterThan(0);
    const initialActive = snapshot.active as SessionRecord;
    expect(initialActive).toBeTruthy();

    const target = snapshot.sessions.find((s) => s.id !== initialActive.meta.id);
    expect(target).toBeTruthy();
    if (!target) return;

    await manager.switchToUser(target.id);
    snapshot = manager.getSnapshot();
    expect(snapshot.active?.meta.id).toBe(target.id);

    manager.setLockState(target.id, true);
    snapshot = manager.getSnapshot();
    expect(snapshot.sessions.find((s) => s.id === target.id)?.locked).toBe(true);
    await expect(manager.switchToUser(target.id)).rejects.toThrow('Session is locked');
    manager.setLockState(target.id, false);

    manager.updateActiveSessionState({
      wallpaper: 'wall-2',
      dock: ['terminal'],
      windows: [{ id: 'terminal', x: 120, y: 80 }],
    });

    snapshot = manager.getSnapshot();
    expect(snapshot.active?.session.dock).toContain('terminal');
    expect(snapshot.active?.session.windows[0]).toMatchObject({ id: 'terminal' });

    manager.__resetSessionManagerForTests();
  });
});

