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
import { render } from '@testing-library/react';
import Terminal from '../apps/terminal';

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
});
