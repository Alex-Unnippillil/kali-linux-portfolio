import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import TerminalOutput from '../components/TerminalOutput';

describe('TerminalOutput accessibility', () => {
  beforeEach(() => {
    window.localStorage.clear();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  it('restores persisted screen reader mode', () => {
    window.localStorage.setItem('terminal-output-sr-mode', 'on');
    render(<TerminalOutput text="line one" ariaLabel="terminal output" />);
    const checkbox = screen.getByRole('checkbox', {
      name: /screen reader announcements/i,
    });
    expect(checkbox).toBeChecked();
  });

  it('announces batched updates when enabled', async () => {
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    const { rerender } = render(<TerminalOutput text="hello" ariaLabel="terminal output" />);
    const checkbox = screen.getByRole('checkbox', {
      name: /screen reader announcements/i,
    });

    await user.click(checkbox);
    rerender(<TerminalOutput text={`hello\nworld`} ariaLabel="terminal output" />);
    expect(screen.getByRole('status')).toHaveTextContent('');
    act(() => {
      jest.advanceTimersByTime(400);
    });
    expect(screen.getByRole('status')).toHaveTextContent('world');
  });

  it('announces focus instructions when focused with screen reader mode on', async () => {
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    render(<TerminalOutput text="ready" ariaLabel="terminal output" />);
    const checkbox = screen.getByRole('checkbox', {
      name: /screen reader announcements/i,
    });
    await user.click(checkbox);
    const focusable = screen.getByLabelText('terminal output');
    fireEvent.focus(focusable);
    expect(screen.getByRole('status').textContent).toContain('Screen reader mode is on');
  });
});
