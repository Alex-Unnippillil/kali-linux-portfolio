jest.mock(
  '@xterm/xterm',
  () => {
    const latest = { instance: null as any };
    const Terminal = jest.fn().mockImplementation(() => {
      const instance = {
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
      };
      latest.instance = instance;
      return instance;
    });
    return {
      Terminal,
      __getLatestTerminal: () => latest.instance,
      __clearLatestTerminal: () => {
        latest.instance = null;
      },
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

  it('navigates command history with arrow keys', async () => {
    const { Terminal: XTerm, __getLatestTerminal, __clearLatestTerminal } =
      jest.requireMock('@xterm/xterm') as {
        Terminal: jest.Mock;
        __getLatestTerminal: () => any;
        __clearLatestTerminal: () => void;
      };
    XTerm.mockClear();
    __clearLatestTerminal();
    const ref = createRef<any>();
    render(<Terminal ref={ref} openApp={openApp} />);
    await act(async () => {});
    const termInstance = __getLatestTerminal();
    expect(termInstance).toBeTruthy();
    const dataHandler = termInstance.onData.mock.calls[0][0];
    const keyHandler = termInstance.onKey.mock.calls[0][0];

    await act(async () => {
      dataHandler('f');
      dataHandler('i');
      dataHandler('r');
      dataHandler('s');
      dataHandler('t');
      dataHandler('\r');
      dataHandler('s');
      dataHandler('e');
      dataHandler('c');
      dataHandler('o');
      dataHandler('n');
      dataHandler('d');
      dataHandler('\r');
    });

    termInstance.write.mockClear();
    const preventDefault = jest.fn();

    await act(async () => {
      keyHandler({ domEvent: { key: 'ArrowUp', preventDefault } });
    });
    expect(termInstance.write).toHaveBeenLastCalledWith('second');

    await act(async () => {
      keyHandler({ domEvent: { key: 'ArrowUp', preventDefault } });
    });
    expect(termInstance.write).toHaveBeenLastCalledWith('first');

    await act(async () => {
      keyHandler({ domEvent: { key: 'ArrowDown', preventDefault } });
    });
    expect(termInstance.write).toHaveBeenLastCalledWith('second');

    await act(async () => {
      keyHandler({ domEvent: { key: 'ArrowDown', preventDefault } });
    });
    const lastCall = termInstance.write.mock.calls.at(-1)?.[0] ?? '';
    const sanitized = lastCall.replace(/\u001b\[[0-9;]*m/g, '');
    expect(sanitized).toContain('└─$ ');
  });

  it('appends configured line ending when sending to the worker', async () => {
    const originalWorker = global.Worker;
    const postMessage = jest.fn();
    const workerInstance: any = {
      postMessage,
      terminate: jest.fn(),
      onmessage: null,
    };
    const workerFactory = jest.fn(() => workerInstance);
    (global as any).Worker = workerFactory;

    try {
      const { Terminal: XTerm, __clearLatestTerminal } =
        jest.requireMock('@xterm/xterm') as {
          Terminal: jest.Mock;
          __clearLatestTerminal: () => void;
        };
      XTerm.mockClear();
      __clearLatestTerminal();
      const ref = createRef<any>();
      const { getByRole } = render(<Terminal ref={ref} openApp={openApp} />);
      await act(async () => {});

      expect(workerFactory).toHaveBeenCalled();

      await act(async () => {
        const promise = ref.current?.runCommand('foo');
        workerInstance.onmessage?.({ data: { type: 'end' } });
        await promise;
      });
      expect(postMessage).toHaveBeenLastCalledWith(
        expect.objectContaining({ command: 'foo\n' }),
      );

      await act(async () => {
        fireEvent.click(getByRole('button', { name: 'CR' }));
      });
      await act(async () => {
        const promise = ref.current?.runCommand('bar');
        workerInstance.onmessage?.({ data: { type: 'end' } });
        await promise;
      });
      expect(postMessage).toHaveBeenLastCalledWith(
        expect.objectContaining({ command: 'bar\r' }),
      );

      await act(async () => {
        fireEvent.click(getByRole('button', { name: 'CRLF' }));
      });
      await act(async () => {
        const promise = ref.current?.runCommand('baz');
        workerInstance.onmessage?.({ data: { type: 'end' } });
        await promise;
      });
      expect(postMessage).toHaveBeenLastCalledWith(
        expect.objectContaining({ command: 'baz\r\n' }),
      );
    } finally {
      (global as any).Worker = originalWorker;
    }
  });
});
