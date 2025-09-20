jest.mock(
  '@xterm/xterm',
  () => ({
    Terminal: jest.fn().mockImplementation(() => ({
      open: jest.fn(),
      focus: jest.fn(),
      loadAddon: jest.fn(),
      write: jest.fn(),
      writeln: jest.fn(),
      onData: jest.fn(),
      onKey: jest.fn(),
      onPaste: jest.fn(),
      dispose: jest.fn(),
      clear: jest.fn(),
    })),
  }),
  { virtual: true }
);
jest.mock(
  '@xterm/addon-fit',
  () => ({
    FitAddon: jest.fn().mockImplementation(() => ({ fit: jest.fn() })),
  }),
  { virtual: true }
);
jest.mock(
  '@xterm/addon-search',
  () => ({
    SearchAddon: jest.fn().mockImplementation(() => ({ findNext: jest.fn() })),
  }),
  { virtual: true }
);
jest.mock('@xterm/xterm/css/xterm.css', () => ({}), { virtual: true });

import React, { createRef, act } from 'react';
import { render, fireEvent } from '@testing-library/react';
import Terminal from '../apps/terminal';
import TerminalTabs from '../apps/terminal/tabs';
import createTerminalSessionManager from '../modules/terminal/sessionStore';

describe('Terminal component', () => {
  const openApp = jest.fn();

  beforeEach(() => {
    window.localStorage.clear();
    if (typeof window.confirm === 'function') {
      jest.spyOn(window, 'confirm').mockReturnValue(false);
    }
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('renders container and exposes runCommand', async () => {
    const ref = createRef<any>();
    render(<Terminal ref={ref} openApp={openApp} />);
    await act(async () => {});
    expect(ref.current).toBeTruthy();
    await act(async () => {
      await ref.current.runCommand('help');
    });
    expect(ref.current.getContent()).toContain('help');
  });

  it('invokes openApp for open command', async () => {
    const ref = createRef<any>();
    render(<Terminal ref={ref} openApp={openApp} />);
    await act(async () => {});
    await act(async () => {
      await ref.current.runCommand('open calculator');
    });
    expect(openApp).toHaveBeenCalledWith('calculator');
  });

  it('supports tab management shortcuts', async () => {
    const { container } = render(<TerminalTabs openApp={openApp} />);
    await act(async () => {});
    const root = container.firstChild as HTMLElement;
    root.focus();
    fireEvent.keyDown(root, { ctrlKey: true, key: 't' });
    expect(container.querySelectorAll('.flex.items-center.cursor-pointer').length).toBe(2);

    fireEvent.keyDown(root, { ctrlKey: true, key: 'Tab' });
    const headers = container.querySelectorAll('.flex.items-center.cursor-pointer');
    expect((headers[0] as HTMLElement).className).toContain('bg-gray-700');

    fireEvent.keyDown(root, { ctrlKey: true, key: 'w' });
    expect(container.querySelectorAll('.flex.items-center.cursor-pointer').length).toBe(1);
  });

  it('restores session state after simulated power loss', async () => {
    const manager = createTerminalSessionManager({ profileId: 'test-profile' });
    const tab = manager.createTab();
    const pane = tab.panes.find((p) => p.id === tab.activePaneId)!;

    const ref = createRef<any>();
    const onSnapshot = jest.fn((snapshot) =>
      manager.updatePaneSnapshot(tab.id, snapshot),
    );
    const { unmount } = render(
      <Terminal
        ref={ref}
        openApp={openApp}
        sessionId={pane.id}
        tabId={tab.id}
        onSnapshot={onSnapshot}
        snapshotIntervalMs={0}
        restoreBehavior="never"
      />,
    );
    await act(async () => {
      await ref.current.runCommand('help');
    });
    await act(async () => {
      unmount();
    });

    const layout = manager.getLayout();
    const restoredTab = layout.tabs.find((t) => t.id === tab.id)!;
    const restoredPane =
      restoredTab.panes.find((p) => p.id === restoredTab.activePaneId) ??
      restoredTab.panes[0];

    const ref2 = createRef<any>();
    render(
      <Terminal
        ref={ref2}
        openApp={openApp}
        sessionId={restoredPane.id}
        tabId={restoredTab.id}
        initialSnapshot={restoredPane}
        restoreBehavior="never"
      />,
    );
    await act(async () => {});

    expect(ref2.current.getContent()).toContain('Available commands');
  });
});
