import BadWords from 'bad-words';
import curated from '../../public/wordlists/curated.json';

const medicalAllow = ['heart', 'ulcer', 'nerve', 'tumor', 'virus'];
const filter = new BadWords();
filter.removeWords(...medicalAllow);

const levels = ['easy', 'medium', 'hard'] as const;
export type Difficulty = typeof levels[number];

type Curated = Record<Difficulty, string[]>;
const data = curated as Curated;

const filtered = levels.reduce((acc, level) => {
  acc[level] = data[level].filter((w) => !filter.isProfane(w));
  return acc;
}, {} as Record<Difficulty, string[]>);

export const WORDS_BY_DIFFICULTY = filtered;
export const ALL_GUESSES = Array.from(
  new Set([...filtered.easy, ...filtered.medium, ...filtered.hard]),
);

export const seedIndex = () => {
  const epoch = new Date('2024-01-01T00:00:00Z');
  const today = new Date();
  const diff = Math.floor(
    (today.setUTCHours(0, 0, 0, 0) - epoch.getTime()) / 86400000,
  );
  return diff;
};

export const getAnswer = (difficulty: Difficulty, seed = seedIndex()) => {
  const list = filtered[difficulty];
  return list[seed % list.length];
};
