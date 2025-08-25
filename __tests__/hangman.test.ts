import { createGame, guess, useHint, isWinner, isLoser } from '../apps/hangman/engine';

describe('hangman engine', () => {
  test('repeated letters are solved with single guess', () => {
    const game = createGame('letter');
    expect(guess(game, 'e')).toBe(true);
    expect(game.guessed).toEqual(['e']);
    guess(game, 'e');
    expect(game.guessed).toEqual(['e']);
    ['l', 't', 'r'].forEach((l) => guess(game, l));
    expect(isWinner(game)).toBe(true);
  });

  test('hint reveals one new letter', () => {
    const game = createGame('dog');
    guess(game, 'd');
    const first = useHint(game);
    expect(first && ['o', 'g'].includes(first)).toBe(true);
    expect(game.guessed.includes(first as string)).toBe(true);
    const second = useHint(game);
    expect(second && first !== second).toBe(true);
    expect(game.guessed.includes(second as string)).toBe(true);
  });

  test('win and loss detection', () => {
    const winGame = createGame('hi');
    guess(winGame, 'h');
    guess(winGame, 'i');
    expect(isWinner(winGame)).toBe(true);
    expect(isLoser(winGame)).toBe(false);

    const loseGame = createGame('hi');
    ['a', 'b', 'c', 'd', 'e', 'f'].forEach((l) => guess(loseGame, l));
    expect(isLoser(loseGame)).toBe(true);
    expect(isWinner(loseGame)).toBe(false);
  });
});
