import { describe, it, expect } from 'vitest';
import { parseJSON, parseNumber } from './index';

describe('parsers', () => {
  it('parses valid json', () => {
    expect(parseJSON('{"a":1}')).toEqual({ a: 1 });
  });

  it('returns null for invalid json', () => {
    expect(parseJSON('not json')).toBeNull();
  });

  it('parses numeric strings', () => {
    expect(parseNumber('42')).toBe(42);
  });

  it('returns null for non-numeric strings', () => {
    expect(parseNumber('abc')).toBeNull();
  });
});
