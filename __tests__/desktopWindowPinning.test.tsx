import React from 'react';
import { Desktop } from '../components/screen/desktop';

describe('Desktop window pinning', () => {
  it('elevates pinned windows above others and restores order when unpinned', () => {
    const desktop = new Desktop({ snapEnabled: false } as any);
    (desktop as any).props = { snapEnabled: false };
    Object.assign(desktop.state, {
      activeWorkspace: 0,
      closed_windows: { about: false, terminal: false },
      minimized_windows: { about: false, terminal: false },
      focused_windows: { about: true, terminal: false },
      pinned_windows: { about: false, terminal: false },
      window_positions: {},
    });
    desktop.workspaceStacks = Array.from({ length: desktop.workspaceCount }, () => []);
    desktop.workspaceStacks[0] = ['terminal', 'about'];

    desktop.setWorkspaceState = (updater: any, callback?: () => void) => {
      const partial = typeof updater === 'function' ? updater(desktop.state) : updater;
      Object.assign(desktop.state, partial);
      if (callback) callback();
    };
    desktop.saveSession = jest.fn();

    const initial = desktop.renderWindows() as React.ReactElement[];
    const initialAbout = initial.find((el) => el.props.id === 'about')!;
    const initialTerminal = initial.find((el) => el.props.id === 'terminal')!;
    expect(initialTerminal.props.zIndex).toBeGreaterThan(initialAbout.props.zIndex);

    desktop.toggleWindowPin('about');
    const afterPin = desktop.renderWindows() as React.ReactElement[];
    const pinnedAbout = afterPin.find((el) => el.props.id === 'about')!;
    const pinnedTerminal = afterPin.find((el) => el.props.id === 'terminal')!;
    expect(desktop.state.pinned_windows.about).toBe(true);
    expect(pinnedAbout.props.zIndex).toBeGreaterThan(pinnedTerminal.props.zIndex);

    desktop.toggleWindowPin('about');
    const afterUnpin = desktop.renderWindows() as React.ReactElement[];
    const unpinnedAbout = afterUnpin.find((el) => el.props.id === 'about')!;
    const unpinnedTerminal = afterUnpin.find((el) => el.props.id === 'terminal')!;
    expect(desktop.state.pinned_windows.about).toBe(false);
    expect(unpinnedTerminal.props.zIndex).toBeGreaterThan(unpinnedAbout.props.zIndex);
  });
});
