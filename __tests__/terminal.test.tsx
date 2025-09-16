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

  it('confirms before copying large content', async () => {
    const ref = createRef<any>();
    const writeText = jest.fn().mockResolvedValue(undefined);
    Object.assign(navigator, { clipboard: { writeText } });
    const { getByLabelText } = render(<Terminal ref={ref} openApp={openApp} />);
    await act(async () => {});

    for (let i = 0; i < 200; i++) {
      // about command writes a short line each time
      await act(async () => {
        await ref.current.runCommand('about');
      });
    }

    expect(ref.current.getContent().length).toBeGreaterThan(5000);
    const confirmSpy = jest.spyOn(window, 'confirm').mockReturnValue(false);
    const copyBtn = getByLabelText('Copy');

    fireEvent.click(copyBtn);
    expect(confirmSpy).toHaveBeenCalled();
    expect(writeText).not.toHaveBeenCalled();

    confirmSpy.mockReturnValue(true);
    fireEvent.click(copyBtn);
    expect(writeText).toHaveBeenCalledWith(ref.current.getContent());
  });
});
