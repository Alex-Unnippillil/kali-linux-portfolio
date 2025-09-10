export interface HangmanGame {
  word: string;
  guessed: string[];
  wrong: number;
  hints: number;
}

// Basic dictionaries used by the hangman game. Having them here keeps the
// engine self‑contained so consumers do not need to supply their own word
// lists.
import wordsets from '../../games/hangman/wordsets';

export const DICTIONARIES: Record<string, string[]> = wordsets;

export const FAMILY_WORDS = DICTIONARIES.family;
export const SAT_WORDS = DICTIONARIES.sat;
export const MOVIE_WORDS = DICTIONARIES.movie;

const allWords = () => Object.values(DICTIONARIES).flat();

type GameOptions =
  | string
  | {
      word?: string;
      category?: string;
      hints?: number;
    };

export const createGame = (opts?: GameOptions): HangmanGame => {
  let word: string | undefined;
  let category: string | undefined;
  let hints: number | undefined;
  if (typeof opts === 'string') word = opts;
  else if (opts) ({ word, category, hints } = opts);
  const dict = category ? DICTIONARIES[category] ?? allWords() : allWords();
  const chosen = word ?? dict[Math.floor(Math.random() * dict.length)]!;
  return {
    word: chosen,
    guessed: [],
    wrong: 0,
    hints: hints ?? 3,
  };
};

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
  if (game.hints <= 0) return null;
  const remaining = game.word
    .split('')
    .filter((l) => !game.guessed.includes(l));
  if (remaining.length === 0) return null;
  const unique = Array.from(new Set(remaining));
  const reveal = unique[Math.floor(Math.random() * unique.length)]!;
  game.guessed.push(reveal);
  game.hints -= 1;
  return reveal;
};

export const isWinner = (game: HangmanGame): boolean =>
  game.word.split('').every((l) => game.guessed.includes(l));

export const isLoser = (game: HangmanGame, maxWrong = 6): boolean =>
  game.wrong >= maxWrong;

export const isGameOver = (game: HangmanGame, maxWrong = 6): boolean =>
  isWinner(game) || isLoser(game, maxWrong);

export const importWordList = (category: string, words: string[]) => {
  if (DICTIONARIES[category]) DICTIONARIES[category].push(...words);
  else DICTIONARIES[category] = [...words];
};
