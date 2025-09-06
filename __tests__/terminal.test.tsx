jest.mock(
  '@xterm/xterm',
  () => {
    let lastInstance: any;
    let onDataHandler: (d: string) => void = () => {};
    const textarea = {
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
    };
    const Terminal = jest.fn().mockImplementation(() => {
      lastInstance = {
        open: jest.fn(),
        focus: jest.fn(),
        loadAddon: jest.fn(),
        write: jest.fn(),
        writeln: jest.fn(),
        onData: jest.fn((cb) => {
          onDataHandler = cb;
        }),
        onKey: jest.fn(),
        onPaste: jest.fn(),
        dispose: jest.fn(),
        clear: jest.fn(),
        textarea,
      };
      return lastInstance;
    });
    return {
      Terminal,
      __getLastInstance: () => lastInstance,
      __getOnData: () => onDataHandler,
    };
  },
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
// Access helpers from the mocked xterm module for introspection
const { __getLastInstance, __getOnData } = require('@xterm/xterm');

describe('Terminal component', () => {
  const openApp = jest.fn();

  beforeEach(() => {
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

  it('prints theme info with neofetch', async () => {
    const ref = createRef<any>();
    render(<Terminal ref={ref} openApp={openApp} />);
    await act(async () => {});
    act(() => {
      ref.current.runCommand('neofetch');
    });
    expect(ref.current.getContent()).toContain('Theme: Undercover');
  });

  it('cancels input on Ctrl+C', async () => {
    const ref = createRef<any>();
    render(<Terminal ref={ref} openApp={openApp} />);
    await act(async () => {});
    const term = __getLastInstance();
    const onData = __getOnData();
    await act(async () => {
      onData('neof');
      onData('\u0003');
      onData('neofetch');
      onData('\r');
    });
    expect(ref.current.getContent()).toContain('Theme: Undercover');
  });

  it('handles backspace correctly', async () => {
    const ref = createRef<any>();
    render(<Terminal ref={ref} openApp={openApp} />);
    await act(async () => {});
    const term = __getLastInstance();
    const onData = __getOnData();
    await act(async () => {
      onData('neofetx');
      onData('\u007F');
      onData('ch');
      onData('\r');
    });
    expect(ref.current.getContent()).toContain('Theme: Undercover');
  });

  it('handles paste events', async () => {
    const ref = createRef<any>();
    render(<Terminal ref={ref} openApp={openApp} />);
    await act(async () => {});
    const term = __getLastInstance();
    const pasteHandler = term.textarea.addEventListener.mock.calls.find(
      (c: any[]) => c[0] === 'paste',
    )[1];
    const event = {
      clipboardData: { getData: () => 'neofetch' },
      preventDefault: jest.fn(),
    } as any;
    await act(async () => {
      pasteHandler(event);
      const onData = term.onData.mock.calls[0][0];
      onData('\r');
    });
    expect(event.preventDefault).toHaveBeenCalled();
    expect(ref.current.getContent()).toContain('Theme: Undercover');
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
