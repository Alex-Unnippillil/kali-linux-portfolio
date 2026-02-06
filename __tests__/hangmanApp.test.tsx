import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import Hangman from '../components/apps/hangman';

if (typeof ResizeObserver === 'undefined') {
  // @ts-ignore
  global.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
}

describe('Hangman app', () => {
  test('imports a custom list and starts a game', () => {
    window.localStorage.clear();
    render(<Hangman />);
    fireEvent.click(screen.getByRole('button', { name: 'Options' }));
    const textarea = screen.getByLabelText('Custom word list');
    fireEvent.change(textarea, { target: { value: 'red moon' } });

    fireEvent.click(screen.getByRole('button', { name: 'Import list' }));
    fireEvent.click(screen.getByRole('button', { name: 'Play custom' }));

    expect(screen.getByTestId('hangman-phrase')).toHaveTextContent('___ ____');
  });

  test('ignores keyboard input when unfocused', () => {
    window.localStorage.clear();
    render(<Hangman windowMeta={{ isFocused: false }} />);
    fireEvent.click(screen.getByRole('button', { name: 'Options' }));
    const textarea = screen.getByLabelText('Custom word list');
    fireEvent.change(textarea, { target: { value: 'red' } });
    fireEvent.click(screen.getByRole('button', { name: 'Import list' }));
    fireEvent.click(screen.getByRole('button', { name: 'Play custom' }));

    fireEvent.keyDown(window, { key: 'r' });
    expect(screen.getByTestId('hangman-phrase')).toHaveTextContent('___');
  });

  test('share links do not reveal the answer', async () => {
    window.localStorage.clear();
    const writeText = jest.fn().mockResolvedValue(true);
    Object.assign(navigator, { clipboard: { writeText } });

    render(<Hangman />);
    fireEvent.click(screen.getByRole('button', { name: 'Start' }));
    fireEvent.click(screen.getByRole('button', { name: 'Options' }));

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Copy link' }));
    });

    expect(writeText).toHaveBeenCalled();
    const url = new URL(writeText.mock.calls[0][0]);
    expect(url.searchParams.get('word')).toBe(null);
    expect(url.searchParams.get('seed')).toBeTruthy();
    expect(url.searchParams.get('category')).toBeTruthy();
    expect(url.searchParams.get('difficulty')).toBeTruthy();
  });

  test('timer pauses when the game is paused', () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2024-01-01T00:00:00Z'));
    window.localStorage.clear();
    render(<Hangman />);

    fireEvent.click(screen.getByRole('button', { name: 'Start' }));
    act(() => {
      jest.advanceTimersByTime(4000);
    });

    const timer = screen.getByTestId('hangman-timer');
    const beforePause = timer.textContent;

    fireEvent.click(screen.getByRole('button', { name: 'Options' }));
    fireEvent.click(screen.getByRole('button', { name: 'Pause' }));

    act(() => {
      jest.advanceTimersByTime(4000);
    });

    expect(timer.textContent).toBe(beforePause);
    jest.useRealTimers();
  });
});
