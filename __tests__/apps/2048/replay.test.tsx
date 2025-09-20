import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import Game2048 from '../../../games/2048/index';

const arraysEqual = (a: number[], b: number[]) =>
  a.length === b.length && a.every((val, idx) => val === b[idx]);

const readBoard = (element: HTMLElement): number[] => {
  const cells = element.querySelectorAll('div > div');
  return Array.from(cells).map((cell) => {
    const value = Number(cell.textContent?.trim() || '0');
    return Number.isNaN(value) ? 0 : value;
  });
};

describe('Game 2048 replay', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    act(() => {
      jest.runOnlyPendingTimers();
    });
    jest.useRealTimers();
  });

  test('replays the last completed game after restart', async () => {
    render(<Game2048 />);

    const boardElement = await screen.findByTestId('game-board');
    await waitFor(() => {
      expect(boardElement.querySelectorAll('div > div').length).toBeGreaterThan(0);
    });
    const beforeMove = readBoard(boardElement);
    const directions: Array<'ArrowLeft' | 'ArrowRight' | 'ArrowUp' | 'ArrowDown'> = [
      'ArrowLeft',
      'ArrowRight',
      'ArrowUp',
      'ArrowDown',
    ];
    let finalBoard = beforeMove;
    for (const key of directions) {
      fireEvent.keyDown(window, { key });
      try {
        await waitFor(() => {
          const current = readBoard(boardElement);
          if (!arraysEqual(current, beforeMove)) {
            finalBoard = current;
            return true;
          }
          throw new Error('board unchanged');
        });
        break;
      } catch {
        // try next direction
      }
    }
    expect(finalBoard).not.toEqual(beforeMove);

    fireEvent.click(screen.getByRole('button', { name: 'Restart' }));
    const replayButton = screen.getByRole('button', { name: 'Replay' });
    await waitFor(() => expect(replayButton).not.toBeDisabled());

    fireEvent.click(replayButton);
    await screen.findByRole('dialog');
    const replayBoardElement = await screen.findByTestId('replay-board');

    act(() => {
      jest.runAllTimers();
    });

    expect(readBoard(replayBoardElement)).toEqual(finalBoard);
    expect(screen.getByText(/Seed:/)).toBeInTheDocument();
  });

  test('undo removes the last move from replay history', async () => {
    render(<Game2048 />);

    const boardElement = await screen.findByTestId('game-board');
    await waitFor(() => {
      expect(boardElement.querySelectorAll('div > div').length).toBeGreaterThan(0);
    });

    fireEvent.keyDown(window, { key: 'ArrowLeft' });
    const undoButton = screen.getByRole('button', { name: /Undo/ });
    await waitFor(() => expect(undoButton).not.toBeDisabled());

    fireEvent.click(undoButton);
    await waitFor(() => expect(screen.getByRole('button', { name: /Undo/ })).toBeDisabled());

    fireEvent.click(screen.getByRole('button', { name: 'Restart' }));
    const replayButton = screen.getByRole('button', { name: 'Replay' });
    await waitFor(() => expect(replayButton).toBeDisabled());
  });
});
