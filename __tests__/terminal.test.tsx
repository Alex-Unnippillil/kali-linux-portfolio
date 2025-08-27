jest.mock('react-ga4', () => ({ send: jest.fn(), event: jest.fn() }));
jest.mock(
  'xterm',
  () => {
    const terminalMock = {
      open: jest.fn(),
      write: jest.fn(),
      writeln: jest.fn(),
      loadAddon: jest.fn(),
      onData: jest.fn(),
      onKey: jest.fn(),
      clear: jest.fn(),
      dispose: jest.fn(),
    };
    const Terminal = jest.fn(() => terminalMock);
    return { Terminal, terminalMock, __esModule: true };
  },
  { virtual: true }
);
jest.mock(
  'xterm-addon-fit',
  () => ({
    FitAddon: jest.fn().mockImplementation(() => ({ fit: jest.fn() })),
    __esModule: true,
  }),
  { virtual: true }
);
jest.mock(
  'xterm-addon-search',
  () => ({
    SearchAddon: jest.fn().mockImplementation(() => ({})),
    __esModule: true,
  }),
  { virtual: true }
);
jest.mock('xterm/css/xterm.css', () => ({}), { virtual: true });

import React, { createRef, act } from 'react';
import { render } from '@testing-library/react';
import Terminal from '../components/apps/terminal';
import { terminalMock } from 'xterm';

describe('Terminal component', () => {
  const addFolder = jest.fn();
  const openApp = jest.fn();

  const setup = async () => {
    const ref = createRef<any>();
    await act(async () => {
      render(<Terminal ref={ref} addFolder={addFolder} openApp={openApp} />);
    });
    await act(async () => {});
    return ref;
  };

  it('runs pwd command successfully', async () => {
    const ref = await setup();
    act(() => {
      ref.current.runCommand('pwd');
    });
    expect(ref.current.getContent()).toContain('/home/alex');
  });

  it('handles invalid cd command', async () => {
    const ref = await setup();
    act(() => {
      ref.current.runCommand('cd nowhere');
    });
    expect(ref.current.getContent()).toContain(
      'bash: cd: nowhere: No such file or directory',
    );
  });

  it('Ctrl+L clears terminal', async () => {
    const ref = await setup();
    const onKey = terminalMock.onKey.mock.calls[0][0];
    const preventDefault = jest.fn();
    onKey({ key: 'l', domEvent: { key: 'l', ctrlKey: true, preventDefault } });
    expect(terminalMock.clear).toHaveBeenCalled();
  });
});
