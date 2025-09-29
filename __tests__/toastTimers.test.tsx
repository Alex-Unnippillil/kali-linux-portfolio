import React from 'react';
import { render, screen, act, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Toast from '../components/ui/Toast';

describe('Toast timer controls', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  it('pauses auto-dismiss when the toast receives focus', () => {
    const onClose = jest.fn();
    render(<Toast message="Saved" onClose={onClose} duration={3000} />);

    const toast = screen.getByRole('status');

    act(() => {
      (toast as HTMLElement).focus();
    });

    act(() => {
      jest.advanceTimersByTime(5000);
    });

    expect(onClose).not.toHaveBeenCalled();

    act(() => {
      fireEvent.blur(toast);
    });

    act(() => {
      jest.advanceTimersByTime(3000);
    });

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('stops the timer when paused manually and resumes on demand', async () => {
    const onClose = jest.fn();
    render(<Toast message="Saved" onClose={onClose} duration={5000} />);

    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    const pauseButton = screen.getByRole('button', { name: /pause/i });
    const resumeButton = screen.getByRole('button', { name: /resume/i });

    act(() => {
      jest.advanceTimersByTime(1000);
    });

    await user.click(pauseButton);

    act(() => {
      jest.advanceTimersByTime(6000);
    });

    expect(onClose).not.toHaveBeenCalled();

    await user.click(resumeButton);

    act(() => {
      jest.advanceTimersByTime(4000);
    });

    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
