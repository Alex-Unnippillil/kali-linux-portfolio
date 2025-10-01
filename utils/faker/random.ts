import seedrandom from 'seedrandom';

export interface SeededRandom {
  next(): number;
  int(min: number, max: number): number;
  pick<T>(items: readonly T[]): T;
  bool(probability?: number): boolean;
  sampleSize<T>(items: readonly T[], size: number): T[];
  string(length: number, alphabet?: string): string;
}

const DEFAULT_SEED = 'kali-faker';

export function createSeededRandom(seed?: string | number): SeededRandom {
  const rng = seedrandom(String(seed ?? DEFAULT_SEED));

  const next = () => rng();
  const int = (min: number, max: number) =>
    Math.floor(next() * (max - min + 1)) + min;
  const pick = <T,>(items: readonly T[]): T => items[int(0, items.length - 1)];
  const bool = (probability = 0.5) => next() < probability;
  const string = (length: number, alphabet = 'abcdef0123456789') =>
    Array.from({ length }, () => alphabet[int(0, alphabet.length - 1)]).join('');
  const sampleSize = <T,>(items: readonly T[], size: number): T[] => {
    if (size >= items.length) {
      return [...items];
    }
    const taken = new Set<number>();
    while (taken.size < size) {
      taken.add(int(0, items.length - 1));
    }
    return Array.from(taken).map((idx) => items[idx]);
  };

  return { next, int, pick, bool, sampleSize, string };
}
