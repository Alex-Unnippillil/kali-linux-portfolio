export interface HangmanGame {
  word: string;
  guessed: string[];
  wrong: number;
  hints: number;
}

export type HangmanDictionary = Record<string, string[]>;

// Basic dictionaries used by the hangman game. Having them here keeps the
// engine self‑contained so consumers do not need to supply their own word
// lists.
import wordsets from '../../games/hangman/wordsets';

export const DICTIONARIES: HangmanDictionary = wordsets;

export const FAMILY_WORDS = DICTIONARIES.family;
export const SAT_WORDS = DICTIONARIES.sat;
export const MOVIE_WORDS = DICTIONARIES.movie;

const LETTER_RE = /^[a-z]$/;

const normalizeWord = (word: string): string => word.trim().toLowerCase();

const allWords = (dictionaries: HangmanDictionary) =>
  Object.values(dictionaries).flat();

type GameOptions =
  | string
  | {
      word?: string;
      category?: string;
      hints?: number;
      dictionaries?: HangmanDictionary;
      rng?: () => number;
    };

export const createGame = (opts?: GameOptions): HangmanGame => {
  let word: string | undefined;
  let category: string | undefined;
  let hints: number | undefined;
  let dictionaries: HangmanDictionary | undefined;
  let rng: (() => number) | undefined;
  if (typeof opts === 'string') word = opts;
  else if (opts) ({ word, category, hints, dictionaries, rng } = opts);
  const source = dictionaries || DICTIONARIES;
  const dict = category ? source[category] || allWords(source) : allWords(source);
  const pick = rng || Math.random;
  const chosen = normalizeWord(word || dict[Math.floor(pick() * dict.length)]);
  return {
    word: chosen,
    guessed: [],
    wrong: 0,
    hints: hints ?? 3,
  };
};

export const guess = (game: HangmanGame, letter: string): boolean => {
  letter = letter.toLowerCase();
  if (!LETTER_RE.test(letter)) return false;
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
    .filter((l) => LETTER_RE.test(l) && !game.guessed.includes(l));
  if (remaining.length === 0) return null;
  const unique = Array.from(new Set(remaining));
  const reveal = unique[Math.floor(Math.random() * unique.length)];
  game.guessed.push(reveal);
  game.hints -= 1;
  return reveal;
};

export const isWinner = (game: HangmanGame): boolean =>
  game.word
    .split('')
    .filter((l) => LETTER_RE.test(l))
    .every((l) => game.guessed.includes(l));

export const isLoser = (game: HangmanGame, maxWrong = 6): boolean =>
  game.wrong >= maxWrong;

export const isGameOver = (game: HangmanGame, maxWrong = 6): boolean =>
  isWinner(game) || isLoser(game, maxWrong);

export const importWordList = (
  category: string,
  words: string[],
  dictionaries: HangmanDictionary = DICTIONARIES,
): HangmanDictionary => {
  const next = { ...dictionaries };
  const existing = Array.isArray(dictionaries[category])
    ? dictionaries[category]
    : [];
  next[category] = [...existing, ...words.map(normalizeWord)];
  return next;
};
