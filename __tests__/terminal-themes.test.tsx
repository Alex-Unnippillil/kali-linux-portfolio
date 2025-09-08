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
import { render, fireEvent } from '@testing-library/react';
import TerminalTabs from '../apps/terminal/tabs';

beforeEach(() => {
  window.localStorage.clear();
});

describe('Terminal theme switching', () => {
  it('applies and persists selected theme', async () => {
    const { getByLabelText, getByText, container, unmount } = render(
      <TerminalTabs />,
    );
    await act(async () => {
      await Promise.resolve();
    });
    fireEvent.click(getByLabelText('Settings'));
    fireEvent.change(getByLabelText('Color Scheme'), {
      target: { value: 'Dracula' },
    });
    fireEvent.click(getByText('Apply'));
    await act(async () => {
      await Promise.resolve();
    });
    expect(window.localStorage.getItem('terminal-theme')).toBe('"Dracula"');

    unmount();
    const { getByLabelText: getByLabelText2 } = render(<TerminalTabs />);
    await act(async () => {
      await Promise.resolve();
    });
    fireEvent.click(getByLabelText2('Settings'));
    const select = getByLabelText2('Color Scheme') as HTMLSelectElement;
    expect(select.value).toBe('Dracula');
  });
});
