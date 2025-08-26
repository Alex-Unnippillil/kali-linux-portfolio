import React, { createRef, act } from 'react';
import { render } from '@testing-library/react';
import Terminal from '../components/apps/terminal';

jest.mock('react-ga4', () => ({ send: jest.fn(), event: jest.fn() }));
jest.mock(
  '@xterm/xterm',
  () => ({
    Terminal: jest.fn().mockImplementation(() => ({
      open: jest.fn(),
      write: jest.fn(),
      onData: jest.fn(),
      loadAddon: jest.fn(),
      dispose: jest.fn(),
      focus: jest.fn(),
      reset: jest.fn(),
      onKey: jest.fn(),
      writeln: jest.fn(),
      clear: jest.fn(),
    })),
  }),
  { virtual: true }
);
jest.mock(
  '@xterm/addon-fit',
  () => ({
    FitAddon: jest.fn().mockImplementation(() => ({
      activate: jest.fn(),
      fit: jest.fn(),
    })),
  }),
  { virtual: true }
);
jest.mock(
  '@xterm/addon-search',
  () => ({
    SearchAddon: jest.fn().mockImplementation(() => ({ activate: jest.fn() })),
  }),
  { virtual: true }
);
jest.mock('@xterm/xterm/css/xterm.css', () => ({}), { virtual: true });

describe('Terminal component', () => {
  const addFolder = jest.fn();
  const openApp = jest.fn();

  it('runs pwd command successfully', () => {
    const ref = createRef();
    render(<Terminal ref={ref} addFolder={addFolder} openApp={openApp} />);
    act(() => {
      ref.current.runCommand('pwd');
    });
    expect(ref.current.getContent()).toContain('/home/alex');
  });

  it('handles invalid cd command', () => {
    const ref = createRef();
    render(<Terminal ref={ref} addFolder={addFolder} openApp={openApp} />);
    act(() => {
      ref.current.runCommand('cd nowhere');
    });
    expect(ref.current.getContent()).toContain("bash: cd: nowhere: No such file or directory");
  });

  it('supports history, clear, and help commands', () => {
    const ref = createRef();
    render(<Terminal ref={ref} addFolder={addFolder} openApp={openApp} />);
    act(() => {
      ref.current.runCommand('pwd');
      ref.current.runCommand('history');
    });
    expect(ref.current.getContent()).toContain('pwd');
    act(() => {
      ref.current.runCommand('clear');
    });
    expect(ref.current.getContent()).toContain('pwd');
    act(() => {
      ref.current.runCommand('help');
    });
    expect(ref.current.getContent()).toContain('Available commands:');
    expect(ref.current.getContent()).toContain('clear');
    expect(ref.current.getContent()).toContain('help');
  });

  it('handles missing Worker gracefully', () => {
    const ref = createRef();
    const originalWorker = (global as any).Worker;
    (global as any).Worker = undefined;
    render(<Terminal ref={ref} addFolder={addFolder} openApp={openApp} />);
    act(() => {
      ref.current.runCommand('simulate');
    });
    expect(ref.current.getContent()).toContain('Web Workers are not supported');
    (global as any).Worker = originalWorker;
  });

  it('navigates command history with arrow keys', () => {
    const ref = createRef();
    render(<Terminal ref={ref} addFolder={addFolder} openApp={openApp} />);
    act(() => {
      ref.current.runCommand('pwd');
      ref.current.historyNav('up');
    });
    expect(ref.current.getCommand()).toBe('pwd');
    act(() => {
      ref.current.historyNav('down');
    });
    expect(ref.current.getCommand()).toBe('');
  });
});
