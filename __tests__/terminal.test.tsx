import React, { createRef, act } from 'react';
import { render } from '@testing-library/react';
import Terminal from '../components/apps/terminal';

let onKeyHandler: any = null;

jest.mock('@xterm/xterm', () => {
  const Terminal = jest.fn().mockImplementation(() => ({
    open: jest.fn(),
    loadAddon: jest.fn(),
    write: jest.fn(),
    writeln: jest.fn(),
    clear: jest.fn(),
    onKey: jest.fn((cb) => {
      onKeyHandler = cb;
    }),
    dispose: jest.fn(),
  }));
  return { Terminal };
});

jest.mock('@xterm/addon-fit', () => ({
  FitAddon: jest.fn().mockImplementation(() => ({ fit: jest.fn() })),
}));

jest.mock('@xterm/addon-search', () => ({
  SearchAddon: jest.fn().mockImplementation(() => ({ activate: jest.fn() })),
}));

jest.mock('@xterm/xterm/css/xterm.css', () => ({}), { virtual: true });

describe('Terminal component', () => {
  const addFolder = jest.fn();
  const openApp = jest.fn();

  const flush = () => act(async () => {
    await Promise.resolve();
  });

  it('runCommand pwd returns home path', async () => {
    const ref: any = createRef();
    render(<Terminal ref={ref} addFolder={addFolder} openApp={openApp} />);
    await flush();
    let result = '';
    act(() => {
      result = ref.current.runCommand('pwd');
    });
    expect(result).toBe('/home/alex');
  });

  it('invalid cd shows error', async () => {
    const ref: any = createRef();
    render(<Terminal ref={ref} addFolder={addFolder} openApp={openApp} />);
    await flush();
    let result = '';
    act(() => {
      result = ref.current.runCommand('cd nowhere');
    });
    expect(result).toContain('No such file or directory');
  });

  it('Ctrl+L clears output', async () => {
    const ref: any = createRef();
    render(<Terminal ref={ref} addFolder={addFolder} openApp={openApp} />);
    await flush();
    act(() => {
      ref.current.runCommand('pwd');
    });
    act(() => {
      onKeyHandler({ key: '', domEvent: { ctrlKey: true, key: 'l', preventDefault: jest.fn() } });
    });
    expect(ref.current.getContent()).toBe('');
  });
});
