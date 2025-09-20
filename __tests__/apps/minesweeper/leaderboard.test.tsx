import React from 'react';
import { act, fireEvent, render, screen, within } from '@testing-library/react';
import '@testing-library/jest-dom';
import MinesweeperApp from '../../../apps/minesweeper';

jest.mock('../../../components/apps/minesweeper', () => {
  const React = require('react');
  return function MockMinesweeper({
    onGameStart,
    onGameEnd,
    onStatusChange,
    onPausedChange,
    difficulty,
  }: any) {
    React.useEffect(() => {
      onStatusChange?.('ready');
    }, [onStatusChange]);
    return (
      <div>
        <button
          type="button"
          onClick={() => {
            onGameStart?.({ difficulty, elapsed: 0 });
            onStatusChange?.('playing');
          }}
        >
          Start
        </button>
        <button type="button" onClick={() => onPausedChange?.(true)}>
          Pause
        </button>
        <button type="button" onClick={() => onPausedChange?.(false)}>
          Resume
        </button>
        <button
          type="button"
          onClick={() => {
            onGameEnd?.({ result: 'won', time: 1.5, difficulty });
            onStatusChange?.('won');
          }}
        >
          Win
        </button>
        <button
          type="button"
          onClick={() => {
            onGameEnd?.({ result: 'lost', time: 2, difficulty });
            onStatusChange?.('lost');
          }}
        >
          Lose
        </button>
      </div>
    );
  };
});

describe('Minesweeper leaderboard', () => {
  let promptSpy: jest.SpyInstance<string | null, [message?: string, _default?: string]>;

  beforeEach(() => {
    localStorage.clear();
    jest.useFakeTimers();
    promptSpy = jest.spyOn(window, 'prompt').mockReturnValue('Tester');
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
    promptSpy.mockRestore();
  });

  it('starts the timer on game start and stops it on win', () => {
    render(<MinesweeperApp />);
    const startButton = screen.getByRole('button', { name: /start/i });
    const winButton = screen.getByRole('button', { name: /win/i });
    const timerDisplay = screen.getByTestId('timer-display');

    expect(timerDisplay).toHaveTextContent('0.00s');

    fireEvent.click(startButton);
    act(() => {
      jest.advanceTimersByTime(2500);
    });
    expect(timerDisplay).toHaveTextContent('2.50s');

    fireEvent.click(winButton);
    expect(timerDisplay).toHaveTextContent('1.50s');

    act(() => {
      jest.advanceTimersByTime(2000);
    });
    expect(timerDisplay).toHaveTextContent('1.50s');
  });

  it('records leaderboard entries per difficulty and supports clearing records', () => {
    render(<MinesweeperApp />);
    promptSpy.mockReturnValueOnce('Alice').mockReturnValueOnce('Bob').mockReturnValue('Tester');
    fireEvent.click(screen.getByRole('button', { name: /start/i }));
    fireEvent.click(screen.getByRole('button', { name: /win/i }));

    expect(promptSpy).toHaveBeenCalled();
    expect(screen.getByText(/Alice/)).toBeInTheDocument();
    const leaderboardList = screen.getByTestId('leaderboard-list');
    expect(within(leaderboardList).getByText(/1\.50s/)).toBeInTheDocument();

    let stored = JSON.parse(localStorage.getItem('minesweeper:leaderboard') || '{}');
    expect(stored.beginner).toHaveLength(1);

    fireEvent.change(screen.getByTestId('difficulty-select'), {
      target: { value: 'expert' },
    });
    expect(screen.getByText(/No records yet/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /start/i }));
    fireEvent.click(screen.getByRole('button', { name: /win/i }));

    expect(screen.getByText(/Bob/)).toBeInTheDocument();

    stored = JSON.parse(localStorage.getItem('minesweeper:leaderboard') || '{}');
    expect(stored.beginner).toHaveLength(1);
    expect(stored.expert).toHaveLength(1);

    fireEvent.click(screen.getByRole('button', { name: /clear leaderboard/i }));
    expect(screen.getByText(/No records yet/i)).toBeInTheDocument();

    stored = JSON.parse(localStorage.getItem('minesweeper:leaderboard') || '{}');
    Object.values(stored).forEach((entries: unknown) => {
      expect(Array.isArray(entries)).toBe(true);
      expect(entries).toHaveLength(0);
    });
  });
});
