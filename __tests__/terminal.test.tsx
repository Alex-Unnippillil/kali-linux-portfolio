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
import { createSessionId, resetSessions } from '../apps/terminal/state';

describe('Terminal component', () => {
  const openApp = jest.fn();

  beforeEach(() => {
    resetSessions();
    openApp.mockReset();
  });

  it('renders container and exposes runCommand', async () => {
    const ref = createRef<any>();
    render(<Terminal ref={ref} openApp={openApp} sessionId={createSessionId()} />);
    await act(async () => {});
    expect(ref.current).toBeTruthy();
    act(() => {
      ref.current.runCommand('help');
    });
    expect(ref.current.getContent()).toContain('help');
  });

  it('invokes openApp for open command', async () => {
    const ref = createRef<any>();
    render(<Terminal ref={ref} openApp={openApp} sessionId={createSessionId()} />);
    await act(async () => {});
    act(() => {
      ref.current.runCommand('open calculator');
    });
    expect(openApp).toHaveBeenCalledWith('calculator');
  });

  it('supports tab management shortcuts', async () => {
    const { container } = render(<TerminalTabs openApp={openApp} />);
    await act(async () => {});
    const tabWindow = container.querySelector('[tabindex="0"]') as HTMLElement;
    tabWindow.focus();
    await act(async () => {
      fireEvent.keyDown(tabWindow, { ctrlKey: true, key: 't' });
    });
    expect(container.querySelectorAll('.flex.items-center.cursor-pointer').length).toBe(2);

    await act(async () => {
      fireEvent.keyDown(tabWindow, { ctrlKey: true, key: 'Tab' });
    });
    const headers = container.querySelectorAll('.flex.items-center.cursor-pointer');
    expect((headers[0] as HTMLElement).className).toContain('bg-gray-700');

    await act(async () => {
      fireEvent.keyDown(tabWindow, { ctrlKey: true, key: 'w' });
    });
    expect(container.querySelectorAll('.flex.items-center.cursor-pointer').length).toBe(1);
  });
});
