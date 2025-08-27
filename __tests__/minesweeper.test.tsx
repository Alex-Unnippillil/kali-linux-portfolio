import React, { act } from 'react';
import { render, fireEvent } from '@testing-library/react';
import Minesweeper, { BOARD_SIZE, revealCell } from '../components/apps/minesweeper';

jest.useFakeTimers();

test('flood fill reveals region', () => {
  const board = Array.from({ length: BOARD_SIZE }, () =>
    Array.from({ length: BOARD_SIZE }, () => ({
      mine: false,
      revealed: false,
      flagged: false,
      adjacent: 0,
    })),
  );
  revealCell(board, 0, 0);
  expect(board.every((row) => row.every((cell) => cell.revealed))).toBe(true);
});

test('timer starts on first click', () => {
  const { getByTestId } = render(<Minesweeper />);
  const cell = getByTestId('cell-0-0');
  fireEvent.click(cell);
  act(() => {
    jest.advanceTimersByTime(1100);
  });
  const timeText = getByTestId('timer').textContent || '';
  const time = parseFloat(timeText.replace(/[^0-9.]/g, ''));
  expect(time).toBeGreaterThan(0);
});

test('long-press sets flag', () => {
  const { getByTestId } = render(<Minesweeper />);
  const first = getByTestId('cell-0-0');
  fireEvent.click(first);
  const cell = getByTestId('cell-7-7');
  fireEvent.touchStart(cell);
  act(() => {
    jest.advanceTimersByTime(600);
  });
  fireEvent.touchEnd(cell);
  expect(cell.textContent).toBe('🚩');
});

