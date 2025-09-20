import {
  createInitialState,
  DEFAULT_DESKTOPS,
  virtualDesktopsReducer,
  VirtualDesktopsState,
} from '../../hooks/useVirtualDesktops';

describe('virtualDesktopsReducer', () => {
  it('assigns windows to known desktops', () => {
    const initial = createInitialState();
    const next = virtualDesktopsReducer(initial, {
      type: 'ASSIGN_WINDOW',
      windowId: 'terminal',
      desktopId: DEFAULT_DESKTOPS[1].id,
    });

    expect(next.windowAssignments.terminal).toBe(DEFAULT_DESKTOPS[1].id);
  });

  it('ignores assignments to unknown desktops', () => {
    const initial = createInitialState();
    const next = virtualDesktopsReducer(initial, {
      type: 'ASSIGN_WINDOW',
      windowId: 'terminal',
      desktopId: 'missing-desktop',
    });

    expect(next.windowAssignments.terminal).toBeUndefined();
  });

  it('reorders desktops and normalizes order indices', () => {
    const initial = createInitialState();
    const next = virtualDesktopsReducer(initial, {
      type: 'REORDER',
      sourceId: DEFAULT_DESKTOPS[0].id,
      targetId: DEFAULT_DESKTOPS[1].id,
    });

    expect(next.desktops[0].id).toBe(DEFAULT_DESKTOPS[1].id);
    expect(next.desktops[0].order).toBe(0);
    expect(next.desktops[1].id).toBe(DEFAULT_DESKTOPS[0].id);
    expect(next.desktops[1].order).toBe(1);
  });

  it('ignores setActive when desktop id is missing', () => {
    const initial: VirtualDesktopsState = {
      ...createInitialState(),
      activeDesktopId: 'unknown',
    };

    const next = virtualDesktopsReducer(initial, {
      type: 'SET_ACTIVE',
      desktopId: 'missing',
    });

    expect(next.activeDesktopId).toBe('unknown');
  });

  it('removes window assignments', () => {
    const initial: VirtualDesktopsState = {
      ...createInitialState(),
      windowAssignments: { terminal: DEFAULT_DESKTOPS[0].id },
    };

    const next = virtualDesktopsReducer(initial, {
      type: 'UNASSIGN_WINDOW',
      windowId: 'terminal',
    });

    expect(next.windowAssignments.terminal).toBeUndefined();
  });
});
