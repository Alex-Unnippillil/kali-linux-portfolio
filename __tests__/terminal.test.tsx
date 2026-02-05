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
      onScroll: jest.fn(),
      dispose: jest.fn(),
      clear: jest.fn(),
      options: { scrollback: 0 },
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
jest.mock(
  '@xterm/addon-web-links',
  () => ({
    WebLinksAddon: jest.fn().mockImplementation(() => ({})),
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
    openApp.mockClear();
  });

  it('renders container and exposes runCommand', async () => {
    const ref = createRef<any>();
    render(<Terminal ref={ref} openApp={openApp} />);
    await act(async () => {});
    expect(ref.current).toBeTruthy();
    await act(async () => {
      await ref.current.runCommand('help');
    });
    expect(ref.current.getTranscript()).toContain('Available commands');
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

  it('handles ls and cat commands via registry', async () => {
    const ref = createRef<any>();
    render(<Terminal ref={ref} openApp={openApp} />);
    await act(async () => {});
    await act(async () => {
      await ref.current.runCommand('ls');
    });
    expect(ref.current.getTranscript()).toContain('Desktop');
    await act(async () => {
      await ref.current.runCommand('cat Desktop/Welcome.txt');
    });
    expect(ref.current.getTranscript()).toContain('Welcome to your Kali-style desktop');
  });

  it('clears history and prints about/date messages', async () => {
    jest.useFakeTimers().setSystemTime(new Date('2023-01-01T00:00:00Z'));
    const ref = createRef<any>();
    render(<Terminal ref={ref} openApp={openApp} />);
    await act(async () => {});
    await act(async () => {
      await ref.current.runCommand('about');
    });
    expect(ref.current.getTranscript()).toContain('powered by xterm.js');
    await act(async () => {
      await ref.current.runCommand('date');
    });
    expect(ref.current.getTranscript()).toContain('Jan 01 2023');
    await act(async () => {
      await ref.current.runCommand('clear');
    });
    expect(ref.current.getTranscript()).toBe('');
    jest.useRealTimers();
  });

  it('prints projects and runs simulated ssh/sudo commands', async () => {
    const ref = createRef<any>();
    render(<Terminal ref={ref} openApp={openApp} />);
    await act(async () => {});
    await act(async () => {
      await ref.current.runCommand('projects');
    });
    expect(ref.current.getTranscript()).toContain('Projects catalog');
    await act(async () => {
      await ref.current.runCommand('ssh demo@kali');
    });
    expect(ref.current.getTranscript()).toContain('Connection closed (simulation).');
    await act(async () => {
      await ref.current.runCommand('sudo rm -rf /');
    });
    expect(ref.current.getTranscript()).toContain('refusing to delete /');
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
