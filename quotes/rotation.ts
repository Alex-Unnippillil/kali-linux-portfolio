import { getQuoteKey, type Quote } from './localQuotes';

const defaultRng = () => Math.random();

export const createRotationQueue = (
  quotes: Quote[],
  lastQuote: Quote | null = null,
  rng: () => number = defaultRng,
): number[] => {
  if (quotes.length === 0) return [];

  const indices = quotes.map((_, index) => index);

  for (let i = indices.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    [indices[i], indices[j]] = [indices[j], indices[i]];
  }

  if (lastQuote && quotes.length > 1) {
    const lastKey = getQuoteKey(lastQuote);
    const lastIndex = quotes.findIndex((quote) => getQuoteKey(quote) === lastKey);

    if (lastIndex !== -1 && indices[0] === lastIndex) {
      const swapIndex = indices.findIndex((index) => index !== lastIndex);
      if (swapIndex > 0) {
        [indices[0], indices[swapIndex]] = [indices[swapIndex], indices[0]];
      }
    }
  }

  return indices;
};
