import { basicLexicalFeatures } from '../lib/lexical';

describe('basicLexicalFeatures', () => {
  it('computes basic metrics', () => {
    const text = 'Hello world! Hello AI.';
    const f = basicLexicalFeatures(text);
    expect(f.wordCount).toBe(4);
    expect(f.uniqueWords).toBe(3);
    expect(f.sentenceCount).toBe(2);
    expect(f.averageWordLength).toBe(4.75);
  });
});
