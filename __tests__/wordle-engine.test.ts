import { evaluateGuess, validateGuess, checkHardMode, LetterState } from '../apps/wordle/engine';
import { ALL_GUESSES } from '../apps/wordle/words';

describe('word game engine', () => {
  it('evaluates guesses correctly', () => {
    expect(evaluateGuess('apple', 'apple')).toEqual([
      'correct',
      'correct',
      'correct',
      'correct',
      'correct',
    ]);
    expect(evaluateGuess('paper', 'apple')).toEqual([
      'present',
      'present',
      'correct',
      'present',
      'absent',
    ]);
  });

  it('validates guesses against dictionary', () => {
    expect(validateGuess('apple', ALL_GUESSES)).toBeNull();
    expect(validateGuess('app', ALL_GUESSES)).toBe('Word must be 5 letters');
    expect(validateGuess('zzzzz', ALL_GUESSES)).toBe('Word not in list');
  });

  it('enforces hard mode hints', () => {
    const guesses = ['apple'];
    const statuses: LetterState[][] = [[
      'correct',
      'absent',
      'absent',
      'absent',
      'absent',
    ]];
    expect(checkHardMode('bpppp', guesses, statuses, true)).toBe(false);

    const guesses2 = ['train'];
    const statuses2: LetterState[][] = [[
      'present',
      'absent',
      'absent',
      'absent',
      'absent',
    ]];
    expect(checkHardMode('cbbbb', guesses2, statuses2, true)).toBe(false);
    expect(checkHardMode('tbbbb', guesses2, statuses2, true)).toBe(true);
  });
});
