import { BloomFilter } from '../../../apps/autopsy/utils/bloom';

describe('BloomFilter', () => {
  it('stores values without false negatives', () => {
    const values = ['alpha', 'beta', 'gamma'];
    const filter = BloomFilter.from(values, 0.01);

    values.forEach((value) => {
      expect(filter.has(value)).toBe(true);
    });

    expect(filter.has('delta')).toBe(false);
  });

  it('keeps false positive rate below 1% for random misses', () => {
    const dataset = Array.from({ length: 1000 }, (_, index) => `item-${index}`);
    const filter = BloomFilter.from(dataset, 0.01);

    dataset.forEach((value) => expect(filter.has(value)).toBe(true));

    let seed = 123456789;
    const nextRandom = () => {
      seed = (Math.imul(seed, 1103515245) + 12345) & 0x7fffffff;
      return seed / 0x7fffffff;
    };

    const trials = 10_000;
    let falsePositives = 0;
    for (let i = 0; i < trials; i += 1) {
      const missValue = `miss-${Math.floor(nextRandom() * 1e9)}`;
      if (filter.has(missValue)) {
        falsePositives += 1;
      }
    }

    const rate = falsePositives / trials;
    expect(rate).toBeLessThan(0.01);
  });
});
