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
import { render, fireEvent } from '@testing-library/react';
import Terminal from '../apps/terminal';
import TerminalTabs from '../apps/terminal/tabs';
import { Terminal as XTermTerminal } from '@xterm/xterm';

describe('Terminal component', () => {
  const openApp = jest.fn();

  beforeEach(() => {
    localStorage.clear();
    (XTermTerminal as any).mockClear();
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

  it('prompts before multi-line paste and can always allow', async () => {
    const { getByText, queryByText, getByLabelText } = render(
      <Terminal openApp={openApp} />,
    );
    await act(async () => {});
    const instance = (XTermTerminal as any).mock.results[0].value;
    const dataCb = instance.onData.mock.calls[0][0];
    const ESC = String.fromCharCode(27);
    act(() => {
      dataCb(`${ESC}[200~line1\nline2${ESC}[201~`);
    });
    expect(getByText('Paste 2 lines?')).toBeInTheDocument();
    const checkbox = getByLabelText('Always allow') as HTMLInputElement;
    act(() => fireEvent.click(checkbox));
    await act(async () => {});
    await act(async () => {
      fireEvent.click(getByText('Paste'));
    });
    expect(localStorage.getItem('alwaysAllowPaste')).toBe('true');
    expect(queryByText('Paste 2 lines?')).toBeNull();
    act(() => {
      dataCb(`${ESC}[200~a\nb${ESC}[201~`);
    });
    expect(queryByText('Paste 2 lines?')).toBeNull();
  });
});
