export interface HangmanGame {
  word: string;
  guessed: string[];
  wrong: number;
}

export const createGame = (word: string): HangmanGame => ({
  word,
  guessed: [],
  wrong: 0,
});

export const guess = (game: HangmanGame, letter: string): boolean => {
  letter = letter.toLowerCase();
  if (game.guessed.includes(letter)) return game.word.includes(letter);
  game.guessed.push(letter);
  if (!game.word.includes(letter)) {
    game.wrong += 1;
    return false;
  }
  return true;
};

export const useHint = (game: HangmanGame): string | null => {
  const remaining = game.word
    .split('')
    .filter((l) => !game.guessed.includes(l));
  if (remaining.length === 0) return null;
  const unique = Array.from(new Set(remaining));
  const reveal = unique[Math.floor(Math.random() * unique.length)];
  game.guessed.push(reveal);
  return reveal;
};

export const isWinner = (game: HangmanGame): boolean =>
  game.word.split('').every((l) => game.guessed.includes(l));

export const isLoser = (game: HangmanGame, maxWrong = 6): boolean =>
  game.wrong >= maxWrong;
