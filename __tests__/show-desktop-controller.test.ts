import { createShowDesktopController, type DesktopWindow, type DesktopCommand } from '../utils/showDesktopController';

describe('Show desktop uses acknowledged window-manager commands', () => {
  afterEach(() => jest.useRealTimers());
  function harness() {
    let workspace = 0;
    let apps: DesktopWindow[] = [
      { id: 'about', isFocused: true },
      { id: 'calculator', isMinimized: false },
      { id: 'notes', isMinimized: true },
    ];
    const send = jest.fn<void, [DesktopCommand]>();
    const controller = createShowDesktopController(send);
    const update = () => controller.update({ activeWorkspace: workspace, runningApps: apps });
    const acknowledge = () => {
      const command = send.mock.calls[send.mock.calls.length - 1][0];
      apps = apps.map((app) => app.id === command.appId
        ? { ...app, isMinimized: command.action === 'minimize', isFocused: command.action === 'open' }
        : { ...app, isFocused: command.action === 'open' ? false : app.isFocused });
      update();
    };
    update();
    return { controller, send, acknowledge, update,
      close: (id: string) => { apps = apps.filter((app) => app.id !== id); update(); },
      switchWorkspace: () => { workspace = 1; apps = [{ id: 'gallery' }]; update(); },
    };
  }

  test('minimizes only visible windows and restores the original focused window last', () => {
    const h = harness();
    h.controller.toggle();
    expect(h.controller.getSnapshot().busy).toBe(true);
    expect(h.send.mock.calls).toEqual([[{ appId: 'calculator', action: 'minimize' }]]);
    h.controller.toggle(); // Cannot overlap an unacknowledged operation.
    expect(h.send).toHaveBeenCalledTimes(1);
    h.acknowledge(); h.acknowledge();
    expect(h.controller.getSnapshot()).toEqual({ showing: true, busy: false, available: true });
    h.controller.toggle(); h.acknowledge(); h.acknowledge();
    expect(h.send.mock.calls.map(([command]) => command)).toEqual([
      { appId: 'calculator', action: 'minimize' }, { appId: 'about', action: 'minimize' },
      { appId: 'calculator', action: 'open' }, { appId: 'about', action: 'open' },
    ]);
    expect(h.controller.getSnapshot().showing).toBe(false);
    h.controller.reset();
  });

  test('does not resurrect a closed window or unminimize previously minimized windows', () => {
    const h = harness();
    h.controller.toggle(); h.acknowledge(); h.acknowledge();
    h.close('calculator');
    h.send.mockClear(); h.controller.toggle(); h.acknowledge();
    expect(h.send.mock.calls).toEqual([[{ appId: 'about', action: 'open' }]]);
    h.controller.reset();
  });

  test('cancels in-flight commands on workspace change and isolates the next workspace', () => {
    const h = harness();
    h.controller.toggle(); h.switchWorkspace();
    expect(h.controller.getSnapshot()).toEqual({ showing: false, busy: false, available: true });
    h.send.mockClear(); h.controller.toggle(); h.acknowledge();
    expect(h.send.mock.calls).toEqual([[{ appId: 'gallery', action: 'minimize' }]]);
    h.controller.reset();
  });

  test('does not leave the control busy if the manager cannot acknowledge a command', () => {
    jest.useFakeTimers();
    const h = harness();
    h.controller.toggle(); jest.advanceTimersByTime(3001);
    expect(h.controller.getSnapshot().busy).toBe(false);
    h.controller.reset();
    expect(jest.getTimerCount()).toBe(0);
  });
});
