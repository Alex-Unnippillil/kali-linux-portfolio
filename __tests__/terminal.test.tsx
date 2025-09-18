jest.mock(
  '@xterm/xterm',
  () => ({
    Terminal: jest.fn().mockImplementation(() => ({
    open: jest.fn(),
    focus: jest.fn(),
    blur: jest.fn(),
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
import { render, fireEvent, within } from '@testing-library/react';
import Terminal from '../apps/terminal';
import TerminalTabs from '../apps/terminal/tabs';
import { TERMINAL_COMMANDS } from '../data/terminal-commands';

const XTermCtor = jest.requireMock('@xterm/xterm').Terminal as jest.Mock;

describe('Terminal component', () => {
  const openApp = jest.fn();

  it('renders container and exposes runCommand', async () => {
    const ref = createRef<any>();
    render(<Terminal ref={ref} openApp={openApp} />);
    await act(async () => {});
    expect(ref.current).toBeTruthy();
    act(() => {
      ref.current.runCommand('help');
    });
    expect(ref.current.getContent()).toContain('help');
  });

  it('invokes openApp for open command', async () => {
    const ref = createRef<any>();
    render(<Terminal ref={ref} openApp={openApp} />);
    await act(async () => {});
    act(() => {
      ref.current.runCommand('open calculator');
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

  it('opens the command palette and inserts the selected snippet', async () => {
    const ref = createRef<any>();
    const { getByRole, queryByRole } = render(<Terminal ref={ref} openApp={openApp} />);
    await act(async () => {});

    act(() => {
      fireEvent.keyDown(window, { key: 'P', ctrlKey: true, shiftKey: true });
    });

    const dialog = getByRole('dialog', { name: /command palette/i });
    const input = within(dialog).getByRole('combobox');

    act(() => {
      fireEvent.change(input, { target: { value: 'help' } });
    });

    act(() => {
      fireEvent.keyDown(input, { key: 'Enter' });
    });

    expect(queryByRole('dialog', { name: /command palette/i })).toBeNull();

    const snippet = TERMINAL_COMMANDS.find((cmd) => cmd.id === 'help')?.snippet ?? 'help';
    const terminalInstance =
      XTermCtor.mock.results[XTermCtor.mock.results.length - 1]?.value;

    expect(terminalInstance).toBeDefined();
    expect(terminalInstance.write).toHaveBeenCalledWith(snippet);
  });
});
