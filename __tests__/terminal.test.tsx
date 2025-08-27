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
      clear: jest.fn(),
      dispose: jest.fn(),
    })),
  }),
  { virtual: true },
);
jest.mock(
  '@xterm/addon-fit',
  () => ({
    FitAddon: jest.fn().mockImplementation(() => ({ fit: jest.fn() })),
  }),
  { virtual: true },
);
jest.mock(
  '@xterm/addon-search',
  () => ({
    SearchAddon: jest.fn().mockImplementation(() => ({
      activate: jest.fn(),
      dispose: jest.fn(),
    })),
  }),
  { virtual: true },
);
jest.mock('@xterm/xterm/css/xterm.css', () => ({}), { virtual: true });
jest.mock('react-ga4', () => ({ send: jest.fn(), event: jest.fn() }));

import React, { createRef, act } from 'react';
import { render } from '@testing-library/react';
import Terminal from '../components/apps/terminal';

describe('Terminal component', () => {
  const addFolder = jest.fn();
  const openApp = jest.fn();

  it("runCommand('pwd') returns home path", () => {
    const ref = createRef<any>();
    render(<Terminal ref={ref} addFolder={addFolder} openApp={openApp} />);
    act(() => {
      ref.current.runCommand('pwd');
    });
    expect(ref.current.getContent()).toContain('/home/alex');
  });

  it('invalid cd shows error', () => {
    const ref = createRef<any>();
    render(<Terminal ref={ref} addFolder={addFolder} openApp={openApp} />);
    act(() => {
      ref.current.runCommand('cd nowhere');
    });
    expect(ref.current.getContent()).toContain(
      'bash: cd: nowhere: No such file or directory',
    );
  });

  it('Ctrl+L clears output', () => {
    const ref = createRef<any>();
    render(<Terminal ref={ref} addFolder={addFolder} openApp={openApp} />);
    act(() => {
      ref.current.runCommand('pwd');
    });
    expect(ref.current.getContent()).toContain('/home/alex');
    act(() => {
      ref.current.triggerCtrlL();
    });
    expect(ref.current.getContent()).toBe('');
  });
});

