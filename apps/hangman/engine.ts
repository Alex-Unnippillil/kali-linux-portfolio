export type HangmanDifficulty = 'easy' | 'normal' | 'hard';

export interface HangmanGame {
  word: string;
  guessed: string[];
  wrong: number;
  hints: number;
  difficulty: HangmanDifficulty;
  category: string;
  timeLimit: number;
  timeRemaining: number;
}

// Basic dictionaries used by the hangman game. Having them here keeps the
// engine self-contained so consumers do not need to supply their own word
// lists.
import wordsets from '../../games/hangman/wordsets';

export const DICTIONARIES: Record<string, string[]> = wordsets;

export const FAMILY_WORDS = DICTIONARIES.family;
export const SAT_WORDS = DICTIONARIES.sat;
export const MOVIE_WORDS = DICTIONARIES.movie;

const allWords = () => Object.values(DICTIONARIES).flat();

export const DIFFICULTY_ORDER: HangmanDifficulty[] = ['easy', 'normal', 'hard'];
export const DEFAULT_DIFFICULTY: HangmanDifficulty = 'normal';

export interface DifficultyConfig {
  label: string;
  description: string;
  categories: string[];
  hintTokens: number;
  timer: {
    base: number;
    perLetter: number;
    min: number;
    max: number;
  };
}

export const DIFFICULTY_CONFIG: Record<HangmanDifficulty, DifficultyConfig> = {
  easy: {
    label: 'Casual',
    description: 'Shorter words, extra hints, generous timer.',
    categories: ['family', 'animals', 'movie'],
    hintTokens: 5,
    timer: { base: 90, perLetter: 6, min: 75, max: 360 },
  },
  normal: {
    label: 'Analyst',
    description: 'Balanced timer using technical and geography terms.',
    categories: ['technology', 'movie', 'geography'],
    hintTokens: 3,
    timer: { base: 75, perLetter: 5, min: 60, max: 300 },
  },
  hard: {
    label: 'Red Team',
    description: 'Specialist vocabulary with tight timing.',
    categories: ['cybersecurity', 'mythology', 'sat'],
    hintTokens: 2,
    timer: { base: 60, perLetter: 4, min: 45, max: 240 },
  },
};

type GameOptions =
  | string
  | {
      word?: string;
      category?: string;
      hints?: number;
      difficulty?: HangmanDifficulty;
    };

const getAvailableCategories = (): string[] =>
  Object.entries(DICTIONARIES)
    .filter(([, list]) => Array.isArray(list) && list.length > 0)
    .map(([name]) => name);

export const getDifficultyCategories = (
  difficulty: HangmanDifficulty,
): string[] => {
  const config = DIFFICULTY_CONFIG[difficulty];
  if (!config) return getAvailableCategories();
  const valid = config.categories.filter((category) =>
    (DICTIONARIES[category] || []).length > 0,
  );
  return valid.length ? valid : getAvailableCategories();
};

export const computeTimeLimit = (
  word: string,
  difficulty: HangmanDifficulty,
): number => {
  const config = DIFFICULTY_CONFIG[difficulty] || DIFFICULTY_CONFIG[DEFAULT_DIFFICULTY];
  const raw =
    config.timer.base + word.length * config.timer.perLetter;
  const clamped = Math.min(config.timer.max, Math.max(config.timer.min, raw));
  return Math.round(clamped);
};

const resolveCategory = (
  difficulty: HangmanDifficulty,
  requested?: string,
): string => {
  const available = getAvailableCategories();
  if (requested && (DICTIONARIES[requested] || []).length > 0) return requested;
  const preferred = getDifficultyCategories(difficulty);
  return preferred[0] || available[0];
};

const getWordPool = (
  difficulty: HangmanDifficulty,
  category?: string,
): string[] => {
  if (category && (DICTIONARIES[category] || []).length > 0)
    return DICTIONARIES[category];
  const preferred = getDifficultyCategories(difficulty)
    .map((name) => DICTIONARIES[name])
    .filter((list): list is string[] => Array.isArray(list) && list.length > 0);
  const merged = preferred.flat();
  return merged.length ? merged : allWords();
};

export const createGame = (opts?: GameOptions): HangmanGame => {
  let word: string | undefined;
  let category: string | undefined;
  let hints: number | undefined;
  let difficulty: HangmanDifficulty = DEFAULT_DIFFICULTY;
  if (typeof opts === 'string') word = opts;
  else if (opts) ({ word, category, hints, difficulty = DEFAULT_DIFFICULTY } = opts);

  const resolvedCategory = resolveCategory(difficulty, category);
  const pool = getWordPool(difficulty, resolvedCategory);
  const fallbackWord =
    pool[Math.floor(Math.random() * pool.length)] || allWords()[0] || '';
  const chosenRaw =
    typeof word === 'string' && word.length ? word : fallbackWord;
  const normalized = chosenRaw.toLowerCase();
  const timeLimit = computeTimeLimit(normalized, difficulty);
  const hintTokens =
    hints !== undefined ? hints : DIFFICULTY_CONFIG[difficulty].hintTokens;

  return {
    word: normalized,
    guessed: [],
    wrong: 0,
    hints: hintTokens,
    difficulty,
    category: resolvedCategory,
    timeLimit,
    timeRemaining: timeLimit,
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
  const reveal = unique[Math.floor(Math.random() * unique.length)];
  game.guessed.push(reveal);
  game.hints -= 1;
  return reveal;
};

export const isWinner = (game: HangmanGame): boolean =>
  game.word.split('').every((l) => game.guessed.includes(l));

export const isLoser = (game: HangmanGame, maxWrong = 6): boolean =>
  game.wrong >= maxWrong;

export const isTimeExpired = (game: HangmanGame): boolean => game.timeRemaining <= 0;

export const isGameOver = (game: HangmanGame, maxWrong = 6): boolean =>
  isWinner(game) || isLoser(game, maxWrong) || isTimeExpired(game);

export const tickTimer = (game: HangmanGame, seconds = 1): number => {
  const next = Math.max(0, Math.floor(game.timeRemaining - seconds));
  game.timeRemaining = next;
  return next;
};

export const resetTimer = (game: HangmanGame): void => {
  game.timeRemaining = game.timeLimit;
};

export const importWordList = (category: string, words: string[]) => {
  if (DICTIONARIES[category]) DICTIONARIES[category].push(...words);
  else DICTIONARIES[category] = [...words];
};
