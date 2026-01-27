import { DICTIONARIES, HangmanDictionary, importWordList } from './engine';

export type DifficultyId = 'casual' | 'standard' | 'hard';

export interface DifficultyPreset {
  id: DifficultyId;
  label: string;
  description: string;
  maxWrong: number;
  hintAllowance: number;
  hintCost: number;
  score: {
    correct: number;
    wrong: number;
    hint: number;
    winBonus: number;
  };
}

export interface HangmanState {
  word: string;
  category: string;
  guessed: string[];
  wrong: number;
  maxWrong: number;
  hintsRemaining: number;
  hintCost: number;
  score: number;
  difficulty: DifficultyId;
  status: 'idle' | 'playing' | 'won' | 'lost';
  rngState: number;
}

export interface NewGameOptions {
  category: string;
  word?: string;
  dictionaries?: HangmanDictionary;
  difficulty?: DifficultyId;
  seed?: number | string;
}

export interface HangmanUpdate {
  state: HangmanState;
  event:
    | { type: 'ignored' }
    | { type: 'invalid'; reason: string }
    | { type: 'already'; letter: string }
    | { type: 'correct'; letter: string }
    | { type: 'wrong'; letter: string }
    | { type: 'hint'; letter: string }
    | { type: 'no-hints' }
    | { type: 'won' }
    | { type: 'lost' };
}

const LETTER_RE = /^[a-z]$/;
const SAFE_WORD_RE = /^[a-z -]+$/;

const DEFAULT_DIFFICULTY: DifficultyId = 'standard';

export const DIFFICULTY_PRESETS: Record<DifficultyId, DifficultyPreset> = {
  casual: {
    id: 'casual',
    label: 'Casual',
    description: 'More attempts and generous hints.',
    maxWrong: 8,
    hintAllowance: 3,
    hintCost: 5,
    score: { correct: 8, wrong: 2, hint: 5, winBonus: 15 },
  },
  standard: {
    id: 'standard',
    label: 'Standard',
    description: 'Balanced attempts and scoring.',
    maxWrong: 6,
    hintAllowance: 2,
    hintCost: 7,
    score: { correct: 10, wrong: 3, hint: 7, winBonus: 25 },
  },
  hard: {
    id: 'hard',
    label: 'Hard',
    description: 'Fewer attempts and tighter scoring.',
    maxWrong: 5,
    hintAllowance: 1,
    hintCost: 10,
    score: { correct: 12, wrong: 5, hint: 10, winBonus: 35 },
  },
};

const hashSeed = (seed: string): number => {
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash << 5) - hash + seed.charCodeAt(i);
    hash |= 0;
  }
  return hash >>> 0;
};

const toSeed = (seed?: number | string): number => {
  if (seed === undefined) return Math.floor(Math.random() * 0xffffffff);
  if (typeof seed === 'number') return seed >>> 0;
  return hashSeed(seed);
};

const nextRng = (state: number): [number, number] => {
  const next = (state * 1664525 + 1013904223) >>> 0;
  return [next / 0x100000000, next];
};

const normalizeWord = (word: string): string =>
  word.trim().toLowerCase().replace(/\s+/g, ' ');

const clampScore = (value: number): number => Math.max(0, value);

export const createEmptyState = (
  difficulty: DifficultyId = DEFAULT_DIFFICULTY,
): HangmanState => {
  const preset = DIFFICULTY_PRESETS[difficulty] || DIFFICULTY_PRESETS.standard;
  return {
    word: '',
    category: '',
    guessed: [],
    wrong: 0,
    maxWrong: preset.maxWrong,
    hintsRemaining: preset.hintAllowance,
    hintCost: preset.hintCost,
    score: 0,
    difficulty: preset.id,
    status: 'idle',
    rngState: toSeed(),
  };
};

export const getMaskedWord = (state: HangmanState): string =>
  state.word
    .split('')
    .map((char) => {
      if (char === ' ' || char === '-') return char;
      if (!LETTER_RE.test(char)) return '';
      return state.guessed.includes(char) ? char.toUpperCase() : '_';
    })
    .join('');

export const getRemainingLetters = (state: HangmanState): string[] =>
  Array.from(
    new Set(
      state.word
        .split('')
        .filter((char) => LETTER_RE.test(char) && !state.guessed.includes(char)),
    ),
  );

export const isWin = (state: HangmanState): boolean =>
  !!state.word &&
  state.word
    .split('')
    .filter((char) => LETTER_RE.test(char))
    .every((char) => state.guessed.includes(char));

export const isLose = (state: HangmanState): boolean =>
  !!state.word && state.wrong >= state.maxWrong;

export const getDictionaryTopics = (
  dictionaries: HangmanDictionary = DICTIONARIES,
): string[] => Object.keys(dictionaries);

export const buildDictionaries = (
  customWords: string[],
  dictionaries: HangmanDictionary = DICTIONARIES,
): HangmanDictionary =>
  customWords.length ? importWordList('custom', customWords, dictionaries) : dictionaries;

export const sanitizeWordList = (input: string | string[]) => {
  const lines = Array.isArray(input) ? input : input.split('\n');
  const cleaned: string[] = [];
  const seen = new Set<string>();
  const MAX_WORDS = 200;
  const MAX_LENGTH = 32;

  lines.forEach((line) => {
    const next = line
      .trim()
      .toLowerCase()
      .replace(/[^a-z\s-]/g, '')
      .replace(/\s+/g, ' ')
      .replace(/-+/g, '-')
      .replace(/^-+|-+$/g, '');
    if (!next) return;
    if (!SAFE_WORD_RE.test(next)) return;
    if (next.length < 2 || next.length > MAX_LENGTH) return;
    if (seen.has(next)) return;
    seen.add(next);
    cleaned.push(next);
  });

  return {
    words: cleaned.slice(0, MAX_WORDS),
    total: cleaned.length,
    truncated: cleaned.length > MAX_WORDS,
  };
};

export const newGame = ({
  category,
  word,
  dictionaries = DICTIONARIES,
  difficulty = DEFAULT_DIFFICULTY,
  seed,
}: NewGameOptions): HangmanState => {
  const preset = DIFFICULTY_PRESETS[difficulty] || DIFFICULTY_PRESETS.standard;
  const rngState = toSeed(seed);
  const dictionary = dictionaries[category] || [];
  let chosenWord = word ? normalizeWord(word) : '';
  let nextRngState = rngState;
  if (!chosenWord) {
    if (!dictionary.length) {
      return {
        ...createEmptyState(preset.id),
        category,
      };
    }
    const [roll, updatedState] = nextRng(rngState);
    const pick = dictionary[Math.floor(roll * dictionary.length)];
    chosenWord = normalizeWord(String(pick || ''));
    nextRngState = updatedState;
  }
  return {
    word: chosenWord,
    category,
    guessed: [],
    wrong: 0,
    maxWrong: preset.maxWrong,
    hintsRemaining: preset.hintAllowance,
    hintCost: preset.hintCost,
    score: 0,
    difficulty: preset.id,
    status: chosenWord ? 'playing' : 'idle',
    rngState: nextRngState,
  };
};

export const applyGuess = (
  state: HangmanState,
  letter: string,
): HangmanUpdate => {
  if (state.status !== 'playing') {
    return { state, event: { type: 'ignored' } };
  }
  const normalized = letter.trim().toLowerCase();
  if (!LETTER_RE.test(normalized)) {
    return { state, event: { type: 'invalid', reason: 'letter' } };
  }
  if (state.guessed.includes(normalized)) {
    return { state, event: { type: 'already', letter: normalized } };
  }

  const correct = state.word.includes(normalized);
  const preset = DIFFICULTY_PRESETS[state.difficulty];
  const nextGuessed = [...state.guessed, normalized];
  const nextWrong = correct ? state.wrong : state.wrong + 1;
  const nextScore = clampScore(
    state.score + (correct ? preset.score.correct : -preset.score.wrong),
  );
  let nextState: HangmanState = {
    ...state,
    guessed: nextGuessed,
    wrong: nextWrong,
    score: nextScore,
  };

  if (isWin(nextState)) {
    nextState = {
      ...nextState,
      status: 'won',
      score: clampScore(nextState.score + preset.score.winBonus),
    };
    return { state: nextState, event: { type: 'won' } };
  }

  if (isLose(nextState)) {
    nextState = { ...nextState, status: 'lost' };
    return { state: nextState, event: { type: 'lost' } };
  }

  return {
    state: nextState,
    event: { type: correct ? 'correct' : 'wrong', letter: normalized },
  };
};

export const applyHint = (state: HangmanState): HangmanUpdate => {
  if (state.status !== 'playing') {
    return { state, event: { type: 'ignored' } };
  }
  if (state.hintsRemaining <= 0) {
    return { state, event: { type: 'no-hints' } };
  }

  const remaining = getRemainingLetters(state);
  if (!remaining.length) {
    return { state, event: { type: 'ignored' } };
  }

  const [roll, nextRngState] = nextRng(state.rngState);
  const reveal = remaining[Math.floor(roll * remaining.length)];
  const preset = DIFFICULTY_PRESETS[state.difficulty];

  let nextState: HangmanState = {
    ...state,
    guessed: [...state.guessed, reveal],
    hintsRemaining: state.hintsRemaining - 1,
    score: clampScore(state.score - preset.score.hint),
    rngState: nextRngState,
  };

  if (isWin(nextState)) {
    nextState = {
      ...nextState,
      status: 'won',
      score: clampScore(nextState.score + preset.score.winBonus),
    };
    return { state: nextState, event: { type: 'won' } };
  }

  return { state: nextState, event: { type: 'hint', letter: reveal } };
};
