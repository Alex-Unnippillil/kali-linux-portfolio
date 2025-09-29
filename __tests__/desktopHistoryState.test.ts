import { Desktop } from '../components/screen/desktop';
import {
  DesktopHistoryEntry,
  insertHistoryEntry,
  MAX_HISTORY_ENTRIES,
} from '../components/desktop/history';

jest.mock('react-ga4', () => ({ event: jest.fn(), send: jest.fn() }));

describe('Desktop session history', () => {
  it('persists history entries when saving the session', () => {
    const session = { windows: [], wallpaper: 'wall-2', dock: [], history: [] };
    const setSession = jest.fn();
    const desktop = new Desktop({ session, setSession });

    desktop.state = {
      ...desktop.state,
      closed_windows: { terminal: false },
      minimized_windows: {},
      window_positions: { terminal: { x: 120, y: 120 } },
      session_history: [
        {
          id: 'open-terminal-1',
          appId: 'terminal',
          title: 'Terminal',
          action: 'open',
          timestamp: 1700000000000,
          workspace: 0,
        },
      ],
    };

    desktop.saveSession();

    expect(setSession).toHaveBeenCalledWith(
      expect.objectContaining({
        history: desktop.state.session_history,
        windows: [expect.objectContaining({ id: 'terminal' })],
      }),
    );
  });

  it('caps the history length when inserting new entries', () => {
    const baseEntries: DesktopHistoryEntry[] = Array.from({ length: MAX_HISTORY_ENTRIES }, (_, index) => ({
      id: `open-app-${index}`,
      appId: 'terminal',
      title: 'Terminal',
      action: 'open',
      timestamp: index,
      workspace: 0,
    }));

    const newest: DesktopHistoryEntry = {
      id: 'open-app-new',
      appId: 'terminal',
      title: 'Terminal',
      action: 'open',
      timestamp: 9999,
      workspace: 1,
    };

    const next = insertHistoryEntry(baseEntries, newest);

    expect(next).toHaveLength(MAX_HISTORY_ENTRIES);
    expect(next[0]).toEqual(newest);
    expect(next[next.length - 1].id).toBe(baseEntries[MAX_HISTORY_ENTRIES - 2].id);
  });

  it('switches workspace and reopens windows when jumping to history entries', () => {
    const desktop = new Desktop({ session: { windows: [], wallpaper: 'wall-2', dock: [], history: [] } });

    desktop.state = {
      ...desktop.state,
      activeWorkspace: 0,
      showHistoryDrawer: true,
    };

    const closeDrawer = jest
      .spyOn(desktop, 'closeHistoryDrawer')
      .mockImplementation((callback: (() => void) | undefined) => {
        callback?.();
      });
    const switchWorkspace = jest.spyOn(desktop, 'switchWorkspace').mockImplementation(() => {});
    const openApp = jest.spyOn(desktop, 'openApp').mockImplementation(() => {});

    const entry: DesktopHistoryEntry = {
      id: 'close-terminal',
      appId: 'terminal',
      title: 'Terminal',
      action: 'close',
      timestamp: 1700000005000,
      workspace: 2,
    };

    desktop.handleHistoryJump(entry);

    expect(closeDrawer).toHaveBeenCalledWith(expect.any(Function), { restoreFocus: false });
    expect(switchWorkspace).toHaveBeenCalledWith(2);
    expect(openApp).toHaveBeenCalledWith('terminal', undefined, { skipHistory: true });
  });
});
