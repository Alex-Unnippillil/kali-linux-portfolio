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

describe('Terminal component', () => {
  const openApp = jest.fn();

  beforeEach(() => {
    document.documentElement.style.setProperty('--terminal-background', '#0f1317');
    document.documentElement.style.setProperty('--terminal-foreground', '#f5f5f5');
    document.documentElement.style.setProperty('--terminal-cursor', '#1793d1');
    document.documentElement.style.setProperty(
      '--terminal-selection',
      'rgba(23, 147, 209, 0.35)',
    );
    document.documentElement.style.setProperty(
      '--terminal-font-family',
      "'Hack', 'Fira Code', monospace",
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

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

  it('applies terminal tokens to container styles and new sessions', async () => {
    const ref = createRef<any>();
    const { getByTestId } = render(<Terminal ref={ref} openApp={openApp} />);
    await act(async () => {});
    const container = getByTestId('xterm-container');
    expect(container).toHaveStyle('background: var(--terminal-background)');
    expect(container).toHaveStyle('color: var(--terminal-foreground)');
    expect(container).toHaveStyle('font-family: var(--terminal-font-family)');

    const { Terminal: TerminalCtor } = require('@xterm/xterm') as {
      Terminal: jest.Mock;
    };

    expect(TerminalCtor).toHaveBeenCalled();
    const options = TerminalCtor.mock.calls[0][0];
    expect(options).toMatchObject({ cursorBlink: true });
    expect(options.fontFamily).toContain('Fira Code');
    expect(options.theme).toMatchObject({
      background: '#0f1317',
      cursor: '#1793d1',
      foreground: '#f5f5f5',
      selection: 'rgba(23, 147, 209, 0.35)',
    });
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
});
