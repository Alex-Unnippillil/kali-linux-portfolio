import { createRotationQueue } from '../quotes/rotation';
import { getQuoteKey, type Quote } from '../quotes/localQuotes';

describe('createRotationQueue', () => {
  const sampleQuotes: Quote[] = [
    { content: 'Alpha', author: 'Ada', tags: ['technology'] },
    { content: 'Bravo', author: 'Barbara', tags: ['wisdom'] },
    { content: 'Charlie', author: 'Carlos', tags: ['humor'] },
  ];

  const deterministicRng = () => {
    const values = [0.25, 0.75, 0.5, 0.1];
    let index = 0;
    return () => {
      const value = values[index % values.length];
      index += 1;
      return value;
    };
  };

  it('returns an empty queue when no quotes are available', () => {
    expect(createRotationQueue([], null, () => 0.1)).toEqual([]);
  });

  it('shuffles all quotes exactly once', () => {
    const rng = deterministicRng();
    const order = createRotationQueue(sampleQuotes, null, rng);

    expect(order).toHaveLength(sampleQuotes.length);
    expect(new Set(order).size).toBe(sampleQuotes.length);
  });

  it('avoids repeating the most recent quote when possible', () => {
    const rngFactory = deterministicRng();
    const firstOrder = createRotationQueue(sampleQuotes, null, rngFactory);
    const lastQuote = sampleQuotes[firstOrder[firstOrder.length - 1]];

    const secondOrder = createRotationQueue(sampleQuotes, lastQuote, rngFactory);

    expect(secondOrder[0]).not.toBe(firstOrder[firstOrder.length - 1]);
  });

  it('falls back gracefully when only one quote exists', () => {
    const single: Quote[] = [{ content: 'Solo', author: 'Sasha', tags: ['general'] }];
    const order = createRotationQueue(single, single[0], () => 0.9);

    expect(order).toEqual([0]);
  });

  it('keeps the last quote when it is no longer in the pool', () => {
    const lastQuote = { content: 'Delta', author: 'Dana', tags: ['life'] };
    const order = createRotationQueue(sampleQuotes, lastQuote, () => 0.3);

    expect(order).toHaveLength(sampleQuotes.length);
    const keys = order.map((index) => getQuoteKey(sampleQuotes[index]));
    expect(keys).not.toContain(getQuoteKey(lastQuote));
  });
});
