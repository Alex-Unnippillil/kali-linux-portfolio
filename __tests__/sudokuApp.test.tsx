import React from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import Sudoku from '../components/apps/sudoku';
import { generateSudoku } from '../apps/games/sudoku';
import { explainNextStep, getHint } from '../workers/sudokuSolver';

jest.mock('../apps/games/sudoku', () => {
  const actual = jest.requireActual('../apps/games/sudoku');
  return {
    ...actual,
    generateSudoku: jest.fn(),
  };
});

jest.mock('../workers/sudokuSolver', () => ({
  explainNextStep: jest.fn(),
  getHint: jest.fn(),
}));

const solution = [
  [5, 3, 4, 6, 7, 8, 9, 1, 2],
  [6, 7, 2, 1, 9, 5, 3, 4, 8],
  [1, 9, 8, 3, 4, 2, 5, 6, 7],
  [8, 5, 9, 7, 6, 1, 4, 2, 3],
  [4, 2, 6, 8, 5, 3, 7, 9, 1],
  [7, 1, 3, 9, 2, 4, 8, 5, 6],
  [9, 6, 1, 5, 3, 7, 2, 8, 4],
  [2, 8, 7, 4, 1, 9, 6, 3, 5],
  [3, 4, 5, 2, 8, 6, 1, 7, 9],
];

const puzzle = solution.map((row, r) => row.map((value, c) => (r === 0 && c === 0 ? 0 : value)));

const mockGenerateSudoku = generateSudoku as jest.Mock;
const mockExplain = explainNextStep as jest.Mock;
const mockGetHint = getHint as jest.Mock;

describe('Sudoku app UI', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    mockGenerateSudoku.mockReturnValue({ puzzle, solution });
    mockExplain.mockReset();
    mockGetHint.mockReset();
    window.localStorage.clear();
  });

  afterEach(() => {
    act(() => {
      jest.runOnlyPendingTimers();
    });
    jest.useRealTimers();
  });

  test('keyboard shortcuts undo and redo', async () => {
    render(<Sudoku />);
    const inputs = screen.getAllByRole('textbox');
    const first = inputs[0];
    act(() => {
      first.focus();
    });
    act(() => {
      fireEvent.change(first, { target: { value: '5' } });
    });
    expect(first).toHaveValue('5');

    act(() => {
      fireEvent.keyDown(window, { key: 'z', ctrlKey: true });
    });
    await waitFor(() => expect(first).toHaveValue(''));

    act(() => {
      fireEvent.keyDown(window, { key: 'y', ctrlKey: true });
    });
    await waitFor(() => expect(first).toHaveValue('5'));
  });

  test('renders hint explanation for place hints', () => {
    mockExplain.mockReturnValue({
      kind: 'place',
      r: 0,
      c: 0,
      value: 5,
      technique: 'single candidate',
      reason: 'Only one candidate remains.',
      highlights: [{ r: 0, c: 1 }],
    });
    mockGetHint.mockReturnValue({
      type: 'single',
      r: 0,
      c: 0,
      value: 5,
      technique: 'single candidate',
    });

    render(<Sudoku />);
    act(() => {
      fireEvent.click(screen.getByRole('button', { name: /hint/i }));
    });

    expect(screen.getByText('Technique: single candidate')).toBeInTheDocument();
    expect(screen.getByText('Only one candidate remains.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /apply hint/i })).toBeInTheDocument();
  });

  test('renders hint explanation for eliminate hints', () => {
    mockExplain.mockReturnValue({
      kind: 'eliminate',
      technique: 'naked pair',
      reason: 'Pair restricts digits.',
      highlights: [
        { r: 0, c: 1 },
        { r: 0, c: 2 },
      ],
      eliminations: [{ r: 0, c: 3, remove: [4, 7] }],
    });
    mockGetHint.mockReturnValue({
      type: 'pair',
      cells: [
        { r: 0, c: 1 },
        { r: 0, c: 2 },
      ],
      values: [4, 7],
      technique: 'naked pair',
    });

    render(<Sudoku />);
    act(() => {
      fireEvent.click(screen.getByRole('button', { name: /hint/i }));
    });

    expect(screen.getByText('Technique: naked pair')).toBeInTheDocument();
    expect(screen.getByText('Pair restricts digits.')).toBeInTheDocument();
    expect(screen.getByText('Remove 4, 7 from row 1, col 4')).toBeInTheDocument();
  });

  test('shows completion panel and updates best time', async () => {
    render(<Sudoku />);
    const input = screen.getAllByRole('textbox')[0];
    act(() => {
      fireEvent.change(input, { target: { value: '5' } });
    });

    await waitFor(() => expect(screen.getByText('Puzzle Complete')).toBeInTheDocument());
    expect(screen.getByText('Best')).toBeInTheDocument();
  });

  test('auto notes fills candidates and can be undone', async () => {
    render(<Sudoku />);

    act(() => {
      fireEvent.click(screen.getByRole('button', { name: /auto notes/i }));
    });

    expect(screen.getByText(/Auto notes filled for/i)).toBeInTheDocument();

    act(() => {
      fireEvent.click(screen.getByRole('button', { name: /undo last move/i }));
    });

    await waitFor(() => {
      expect(screen.getByText(/Undid last action/i)).toBeInTheDocument();
    });
  });

  test('clear notes removes candidate notes and supports redo', async () => {
    render(<Sudoku />);

    act(() => {
      fireEvent.click(screen.getByRole('button', { name: /auto notes/i }));
    });

    act(() => {
      fireEvent.click(screen.getByRole('button', { name: /clear notes/i }));
    });

    expect(screen.getByText(/Cleared notes for/i)).toBeInTheDocument();

    act(() => {
      fireEvent.click(screen.getByRole('button', { name: /undo last move/i }));
    });
    await waitFor(() => {
      expect(screen.getByText(/Undid last action/i)).toBeInTheDocument();
    });

    act(() => {
      fireEvent.click(screen.getByRole('button', { name: /redo last move/i }));
    });
    await waitFor(() => {
      expect(screen.getByText(/Redid last action/i)).toBeInTheDocument();
    });
  });

  test('reset clears persisted puzzle state', async () => {
    render(<Sudoku />);

    await waitFor(() =>
      expect(Object.keys(window.localStorage).some((key) => key.startsWith('sudoku:puzzle:'))).toBe(true),
    );
    const puzzleKey = Object.keys(window.localStorage).find((key) => key.startsWith('sudoku:puzzle:')) ?? '';

    act(() => {
      fireEvent.click(screen.getByRole('button', { name: /reset puzzle/i }));
    });

    await waitFor(() => {
      const stored = window.localStorage.getItem(puzzleKey);
      expect(stored).not.toBeNull();
      const parsed = stored ? JSON.parse(stored) : null;
      expect(parsed?.board?.values?.[0]?.[0]).toBe(0);
    });
  });
});
