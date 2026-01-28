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
    await act(async () => {
      await ref.current.runCommand('help');
    });
    expect(ref.current.getContent()).toContain('help');
  });

  it('invokes openApp for open command', async () => {
    const ref = createRef<any>();
    render(<Terminal ref={ref} openApp={openApp} />);
    await act(async () => {});
    await act(async () => {
      await ref.current.runCommand('open calculator');
    });
    expect(openApp).toHaveBeenCalledWith('calculator');
  });

  it('handles ls and cat commands via registry', async () => {
    const ref = createRef<any>();
    render(<Terminal ref={ref} openApp={openApp} />);
    await act(async () => {});
    await act(async () => {
      await ref.current.runCommand('ls');
    });
    expect(ref.current.getContent()).toContain('README.md');
    await act(async () => {
      await ref.current.runCommand('cat README.md');
    });
    expect(ref.current.getContent()).toContain('Welcome to the web terminal.');
  });

  it('clears history and prints about/date messages', async () => {
    jest.useFakeTimers().setSystemTime(new Date('2023-01-01T00:00:00Z'));
    const ref = createRef<any>();
    render(<Terminal ref={ref} openApp={openApp} />);
    await act(async () => {});
    await act(async () => {
      await ref.current.runCommand('about');
    });
    expect(ref.current.getContent()).toContain('lightweight in-browser prompt');
    await act(async () => {
      await ref.current.runCommand('date');
    });
    expect(ref.current.getContent()).toContain('Jan 01 2023');
    await act(async () => {
      await ref.current.runCommand('clear');
    });
    expect(ref.current.getContent()).toBe('');
    jest.useRealTimers();
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
