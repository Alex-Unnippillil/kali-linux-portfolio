import React from 'react';
import { render, screen, fireEvent, within } from '@testing-library/react';

const wordleModule = require('../components/apps/wordle');
const { evaluateGuess, getSolutionForDate } = wordleModule;
const Wordle = wordleModule.default;

describe('Wordle helpers', () => {
  test('maps date to known puzzle', () => {
    expect(getSolutionForDate('2023-01-01')).toBe('ACIES');
  });

  test('evaluateGuess returns expected mapping', () => {
    const result = evaluateGuess('CRANE', 'GRACE');
    expect(result).toEqual(['present', 'correct', 'correct', 'absent', 'correct']);
  });
});

describe('Wordle accessibility cues', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  test('shape icons are visible after guessing', () => {
    const today = new Date().toISOString().split('T')[0];
    const answer = getSolutionForDate(today);
    render(<Wordle />);
    const enter = screen.getByRole('button', { name: 'ENTER' });
    answer.split('').forEach((ch) => {
      fireEvent.click(screen.getByRole('button', { name: ch }));
    });
    fireEvent.click(enter);
    const cells = screen.getAllByLabelText('correct');
    expect(cells).toHaveLength(5);
    const firstCell = cells[0];
    expect(within(firstCell).getByText('●')).toBeInTheDocument();
  });
});
