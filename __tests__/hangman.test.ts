import {
  createGame,
  guess,
  useHint,
  isWinner,
  isLoser,
  isGameOver,
} from '../apps/hangman/engine';

describe('hangman engine', () => {
  test('repeated guess is ignored', () => {
    const game = createGame('letter');
    expect(guess(game, 'e')).toBe(true);
    guess(game, 'e');
    expect(game.guessed).toEqual(['e']);

    expect(guess(game, 'x')).toBe(false);
    expect(game.wrong).toBe(1);
    guess(game, 'x');
    expect(game.wrong).toBe(1);
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
    expect(isGameOver(winGame)).toBe(true);

    const loseGame = createGame('hi');
    ['a', 'b', 'c', 'd', 'e', 'f'].forEach((l) => guess(loseGame, l));
    expect(isLoser(loseGame)).toBe(true);
    expect(isWinner(loseGame)).toBe(false);
    expect(isGameOver(loseGame)).toBe(true);
  });
});
