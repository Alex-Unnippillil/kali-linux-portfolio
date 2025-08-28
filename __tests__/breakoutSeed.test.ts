import { createRng } from '../components/apps/breakout';

describe('breakout rng', () => {
  test('seed produces deterministic sequence', () => {
    const rng1 = createRng('test-seed');
    const rng2 = createRng('test-seed');
    const seq1 = Array.from({ length: 5 }, () => rng1());
    const seq2 = Array.from({ length: 5 }, () => rng2());
    expect(seq1).toEqual(seq2);
  });

  test('different seeds produce different sequences', () => {
    const rng1 = createRng('a');
    const rng2 = createRng('b');
    const seq1 = Array.from({ length: 5 }, () => rng1());
    const seq2 = Array.from({ length: 5 }, () => rng2());
    expect(seq1).not.toEqual(seq2);
  });

  test('unseeded rng remains random', () => {
    const rng1 = createRng();
    const rng2 = createRng();
    const seq1 = Array.from({ length: 5 }, () => rng1());
    const seq2 = Array.from({ length: 5 }, () => rng2());
    expect(seq1).not.toEqual(seq2);
  });
});

