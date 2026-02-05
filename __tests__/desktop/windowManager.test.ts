import { createWindowManagerState, windowManagerReducer } from '../../components/desktop/windowManager';

describe('windowManagerReducer', () => {
  it('opens and focuses windows in order', () => {
    const base = createWindowManagerState();
    const withTerminal = windowManagerReducer(base, { type: 'OPEN', appKey: 'terminal' });
    const withBrowser = windowManagerReducer(withTerminal, { type: 'OPEN', appKey: 'firefox' });

    expect(withBrowser.order).toEqual(['terminal', 'firefox']);
    expect(withBrowser.activeId).toBe('firefox');

    const focused = windowManagerReducer(withBrowser, { type: 'FOCUS', id: 'terminal' });
    expect(focused.order).toEqual(['firefox', 'terminal']);
    expect(focused.activeId).toBe('terminal');
  });

  it('minimizes and closes windows consistently', () => {
    const base = createWindowManagerState();
    const opened = windowManagerReducer(base, { type: 'OPEN', appKey: 'notes' });
    const minimized = windowManagerReducer(opened, { type: 'MINIMIZE', id: 'notes' });

    expect(minimized.windows.notes?.state).toBe('minimized');
    expect(minimized.order).toEqual([]);

    const reopened = windowManagerReducer(minimized, { type: 'FOCUS', id: 'notes' });
    expect(reopened.windows.notes?.state).toBe('normal');
    expect(reopened.order).toEqual(['notes']);

    const closed = windowManagerReducer(reopened, { type: 'CLOSE', id: 'notes' });
    expect(closed.windows.notes).toBeUndefined();
    expect(closed.order).toEqual([]);
    expect(closed.activeId).toBeNull();
  });
});
