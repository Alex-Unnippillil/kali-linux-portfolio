jest.mock(
  '@xterm/xterm',
  () => ({
    Terminal: jest.fn().mockImplementation(() => {
      const element = document.createElement('div');
      element.className = 'xterm';
      const rows = document.createElement('div');
      rows.className = 'xterm-rows';
      const row = document.createElement('div');
      rows.appendChild(row);
      element.appendChild(rows);
      const instance: any = {
        element,
        buffer: { active: { baseY: 0 } },
        attachCustomKeyEventHandler: jest.fn(),
        hasSelection: jest.fn().mockReturnValue(false),
        getSelection: jest.fn().mockReturnValue(''),
        selectLines: jest.fn(),
        open: jest.fn((container: HTMLElement) => {
          container.appendChild(element);
        }),
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
      };
      return instance;
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

const originalClipboard = navigator.clipboard;
const originalPrompt = window.prompt;
const originalExecCommand = (document as any).execCommand;

const getLatestTerminalInstance = () => {
  const mod = require('@xterm/xterm');
  const mock = mod.Terminal as jest.Mock;
  const lastCall = mock.mock.results[mock.mock.results.length - 1];
  return lastCall?.value;
};

afterEach(() => {
  jest.clearAllMocks();
  if (originalClipboard) {
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: originalClipboard,
    });
  } else {
    delete (navigator as any).clipboard;
  }
  window.prompt = originalPrompt;
  if (originalExecCommand !== undefined) {
    Object.defineProperty(document, 'execCommand', {
      configurable: true,
      value: originalExecCommand,
    });
  } else {
    delete (document as any).execCommand;
  }
});

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

  it('copies selection via clipboard API on Ctrl+Shift+C', async () => {
    const { getByTestId } = render(<Terminal openApp={openApp} />);
    await act(async () => {});
    const termInstance = getLatestTerminalInstance();
    termInstance.hasSelection.mockReturnValue(true);
    termInstance.getSelection.mockReturnValue('selection');
    const writeText = jest.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText },
    });
    const handler = termInstance.attachCustomKeyEventHandler.mock.calls[0][0];
    const event = {
      type: 'keydown',
      key: 'c',
      shiftKey: true,
      ctrlKey: true,
      metaKey: false,
      preventDefault: jest.fn(),
    } as unknown as KeyboardEvent;
    handler(event);
    await act(async () => {});
    expect(event.preventDefault).toHaveBeenCalled();
    expect(writeText).toHaveBeenCalledWith('selection');
    expect(termInstance.getSelection).toHaveBeenCalled();
    expect(getByTestId('xterm-container')).toBeTruthy();
  });

  it('falls back to document.execCommand copy when clipboard API missing', async () => {
    render(<Terminal openApp={openApp} />);
    await act(async () => {});
    const termInstance = getLatestTerminalInstance();
    termInstance.hasSelection.mockReturnValue(true);
    termInstance.getSelection.mockReturnValue('legacy');
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: undefined,
    });
    const execSpy = jest.fn();
    Object.defineProperty(document, 'execCommand', {
      configurable: true,
      value: execSpy,
    });
    const handler = termInstance.attachCustomKeyEventHandler.mock.calls[0][0];
    handler({
      type: 'keydown',
      key: 'c',
      shiftKey: true,
      ctrlKey: true,
      metaKey: false,
      preventDefault: jest.fn(),
    } as unknown as KeyboardEvent);
    await act(async () => {});
    expect(execSpy).toHaveBeenCalledWith('copy');
  });

  it('pastes content via clipboard API on Ctrl+Shift+V', async () => {
    render(<Terminal openApp={openApp} />);
    await act(async () => {});
    const termInstance = getLatestTerminalInstance();
    termInstance.write.mockClear();
    const readText = jest.fn().mockResolvedValue('abc');
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { readText },
    });
    const handler = termInstance.attachCustomKeyEventHandler.mock.calls[0][0];
    await act(async () => {
      handler({
        type: 'keydown',
        key: 'v',
        shiftKey: true,
        ctrlKey: true,
        metaKey: false,
        preventDefault: jest.fn(),
      } as unknown as KeyboardEvent);
      await Promise.resolve();
    });
    expect(readText).toHaveBeenCalled();
    expect(termInstance.write).toHaveBeenCalled();
  });

  it('prompts for paste when clipboard API is unavailable', async () => {
    render(<Terminal openApp={openApp} />);
    await act(async () => {});
    const termInstance = getLatestTerminalInstance();
    termInstance.write.mockClear();
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: undefined,
    });
    const promptSpy = jest.fn().mockReturnValue('fallback paste');
    window.prompt = promptSpy;
    const handler = termInstance.attachCustomKeyEventHandler.mock.calls[0][0];
    await act(async () => {
      handler({
        type: 'keydown',
        key: 'v',
        shiftKey: true,
        ctrlKey: true,
        metaKey: false,
        preventDefault: jest.fn(),
      } as unknown as KeyboardEvent);
      await Promise.resolve();
    });
    expect(promptSpy).toHaveBeenCalledWith('Paste text');
    expect(termInstance.write).toHaveBeenCalled();
  });

  it('selects entire line on triple click', async () => {
    const { getByTestId } = render(<Terminal openApp={openApp} />);
    await act(async () => {});
    const container = getByTestId('xterm-container');
    const row = container.querySelector('.xterm-rows > div');
    const termInstance = getLatestTerminalInstance();
    fireEvent.mouseDown(row!, { button: 0, detail: 3 });
    expect(termInstance.selectLines).toHaveBeenCalledWith(0, 0);
  });

  it('toggles column selection class during Alt drag', async () => {
    const { getByTestId } = render(<Terminal openApp={openApp} />);
    await act(async () => {});
    const container = getByTestId('xterm-container');
    const row = container.querySelector('.xterm-rows > div');
    const termInstance = getLatestTerminalInstance();
    fireEvent.mouseDown(row!, { button: 0, altKey: true, detail: 1 });
    expect(termInstance.element.classList.contains('column-select')).toBe(true);
    fireEvent.mouseMove(row!, { altKey: false });
    expect(termInstance.element.classList.contains('column-select')).toBe(false);
  });
});
