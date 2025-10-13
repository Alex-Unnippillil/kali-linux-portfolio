import { generateSequence } from '../components/apps/simon';

describe('generateSequence', () => {
  test('uses seed for deterministic sequences', () => {
    const seq1 = generateSequence(5, 'abc');
    const seq2 = generateSequence(5, 'abc');
    expect(seq1).toEqual(seq2);
  });

  test('different seeds give different sequences', () => {
    const seq1 = generateSequence(5, 'a');
    const seq2 = generateSequence(5, 'b');
    expect(seq1).not.toEqual(seq2);
  });

  test('generates values between 0 and 3 without seed', () => {
    const seq = generateSequence(100);
    expect(seq.every((n) => n >= 0 && n < 4)).toBe(true);
  });
});

