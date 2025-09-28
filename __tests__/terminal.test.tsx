jest.mock(
  '@xterm/xterm',
  () => ({
    Terminal: jest.fn().mockImplementation(() => {
      const element = document.createElement('div');
      element.getBoundingClientRect = () => ({
        width: 0,
        height: 0,
        top: 0,
        left: 0,
        bottom: 0,
        right: 0,
        x: 0,
        y: 0,
        toJSON: () => {},
      });
      return {
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
        selectLines: jest.fn(),
        clearSelection: jest.fn(),
        getSelection: jest.fn().mockReturnValue(''),
        element,
        buffer: { active: { getLine: jest.fn() } },
      };
    }),
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
  let originalClipboard: any;

  beforeEach(() => {
    originalClipboard = (navigator as any).clipboard;
  });

  afterEach(() => {
    if (originalClipboard !== undefined) {
      Object.defineProperty(navigator, 'clipboard', {
        configurable: true,
        value: originalClipboard,
      });
    } else {
      delete (navigator as any).clipboard;
    }
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

  it('handles keyboard copy and paste when clipboard is available', async () => {
    const writeText = jest.fn();
    const readText = jest.fn().mockResolvedValue('pasted text');
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText, readText },
    });
    const ref = createRef<any>();
    render(<Terminal ref={ref} openApp={openApp} />);
    await act(async () => {});

    await act(async () => {
      fireEvent.keyDown(window, { ctrlKey: true, shiftKey: true, key: 'C' });
    });
    expect(writeText).toHaveBeenCalled();

    await act(async () => {
      fireEvent.keyDown(window, { ctrlKey: true, shiftKey: true, key: 'V' });
    });
    expect(readText).toHaveBeenCalled();
  });

  it('disables clipboard actions when clipboard API is unavailable', async () => {
    delete (navigator as any).clipboard;
    const ref = createRef<any>();
    const { getByLabelText } = render(<Terminal ref={ref} openApp={openApp} />);
    await act(async () => {});

    const copyButton = getByLabelText('Copy') as HTMLButtonElement;
    const pasteButton = getByLabelText('Paste') as HTMLButtonElement;
    expect(copyButton.disabled).toBe(true);
    expect(pasteButton.disabled).toBe(true);

    expect(() =>
      fireEvent.keyDown(window, { ctrlKey: true, shiftKey: true, key: 'C' }),
    ).not.toThrow();
    expect(() =>
      fireEvent.keyDown(window, { ctrlKey: true, shiftKey: true, key: 'V' }),
    ).not.toThrow();
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
