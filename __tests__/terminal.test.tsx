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
      registerLinkProvider: jest
        .fn()
        .mockReturnValue({ dispose: jest.fn() }),
      buffer: {
        active: {
          getLine: jest.fn(() => ({
            translateToString: () => '',
          })),
        },
      },
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

jest.mock('../utils/analytics', () => ({
  logEvent: jest.fn(),
}));

jest.mock('../utils/settings/terminalLinks', () => {
  const actual = jest.requireActual('../utils/settings/terminalLinks');
  return {
    ...actual,
    getTrustedPaths: jest.fn().mockResolvedValue(actual.DEFAULT_TRUSTED_PATHS),
    getSecurePasteEnabled: jest.fn().mockResolvedValue(actual.DEFAULT_SECURE_PASTE),
    addTrustedPath: jest
      .fn()
      .mockImplementation(async (path: string) => [...actual.DEFAULT_TRUSTED_PATHS, actual.normalizePath(path)]),
    setSecurePasteEnabled: jest.fn().mockResolvedValue(undefined),
  };
});

import React, { createRef, act } from 'react';
import { render, fireEvent } from '@testing-library/react';
import Terminal from '../apps/terminal';
import TerminalTabs from '../apps/terminal/tabs';


const originalError = console.error;
let consoleErrorSpy: jest.SpyInstance | undefined;

beforeAll(() => {
  consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation((...args) => {
    if (typeof args[0] === 'string' && args[0].includes('not wrapped in act')) {
      return;
    }
    originalError(...args as Parameters<typeof console.error>);
  });
});

afterAll(() => {
  consoleErrorSpy?.mockRestore();
});
describe('Terminal component', () => {
  const openApp = jest.fn();

  it('renders container and exposes runCommand', async () => {
    const ref = createRef<any>();
    render(<Terminal ref={ref} openApp={openApp} />);
    await act(async () => {
      await Promise.resolve();
    });
    expect(ref.current).toBeTruthy();
    act(() => {
      ref.current.runCommand('help');
    });
    expect(ref.current.getContent()).toContain('help');
  });

  it('invokes openApp for open command', async () => {
    const ref = createRef<any>();
    render(<Terminal ref={ref} openApp={openApp} />);
    await act(async () => {
      await Promise.resolve();
    });
    act(() => {
      ref.current.runCommand('open calculator');
    });
    expect(openApp).toHaveBeenCalledWith('calculator');
  });

  it('supports tab management shortcuts', async () => {
    const { container } = render(<TerminalTabs openApp={openApp} />);
    await act(async () => {
      await Promise.resolve();
    });
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
