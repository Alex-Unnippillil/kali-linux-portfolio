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
      options: {},
      buffer: { active: { viewportY: 0, baseY: 0 } },
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
    SearchAddon: jest.fn().mockImplementation(() => ({ findNext: jest.fn() })),
  }),
  { virtual: true },
);

jest.mock('@xterm/xterm/css/xterm.css', () => ({}), { virtual: true });

import React, { act } from 'react';
import { render, fireEvent, screen } from '@testing-library/react';
import Terminal from '../apps/terminal';

const TerminalMock: any = require('@xterm/xterm').Terminal;

describe('terminal prompt presets', () => {
  const openApp = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    window.localStorage.clear();
  });

  it('uses stored preset on mount', async () => {
    window.localStorage.setItem('terminal:prompt', JSON.stringify('Simple'));
    render(<Terminal openApp={openApp} />);
    await act(async () => {});
    const write = TerminalMock.mock.results[0].value.write;
    expect(write).toHaveBeenCalledWith(expect.stringContaining('$ '));
  });

  it('allows switching preset via settings menu', async () => {
    const { unmount } = render(<Terminal openApp={openApp} />);
    await act(async () => {});
    fireEvent.click(screen.getByLabelText('Prompt settings'));
    fireEvent.click(screen.getByText('Simple'));
    expect(window.localStorage.getItem('terminal:prompt')).toBe(
      JSON.stringify('Simple'),
    );
    unmount();
    render(<Terminal openApp={openApp} />);
    await act(async () => {});
    const write = TerminalMock.mock.results[TerminalMock.mock.results.length - 1].value.write;
    expect(write).toHaveBeenCalledWith(expect.stringContaining('$ '));
  });
});

