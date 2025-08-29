import React from 'react';
import { render, fireEvent } from '@testing-library/react';
import SudokuGame from '../games/sudoku';

jest.mock('../apps/games/sudoku', () => {
  const solution = [
    [1, 2, 3, 4, 5, 6, 7, 8, 9],
    [4, 5, 6, 7, 8, 9, 1, 2, 3],
    [7, 8, 9, 1, 2, 3, 4, 5, 6],
    [2, 3, 4, 5, 6, 7, 8, 9, 1],
    [5, 6, 7, 8, 9, 1, 2, 3, 4],
    [8, 9, 1, 2, 3, 4, 5, 6, 7],
    [3, 4, 5, 6, 7, 8, 9, 1, 2],
    [6, 7, 8, 9, 1, 2, 3, 4, 5],
    [9, 1, 2, 3, 4, 5, 6, 7, 8],
  ];
  return {
    SIZE: 9,
    generateSudoku: () => ({
      puzzle: Array.from({ length: 9 }, () => Array(9).fill(0)),
      solution,
    }),
  };
});

test('tracks row and column error counts', () => {
  const { container, getByTestId } = render(<SudokuGame />);
  const inputs = container.querySelectorAll('input');
  fireEvent.change(inputs[0], { target: { value: '9' } });
  expect(getByTestId('row-error-0').textContent).toBe('1');
  expect(getByTestId('col-error-0').textContent).toBe('1');
  fireEvent.change(inputs[1], { target: { value: '9' } });
  expect(getByTestId('row-error-0').textContent).toBe('2');
  expect(getByTestId('col-error-1').textContent).toBe('1');
});
