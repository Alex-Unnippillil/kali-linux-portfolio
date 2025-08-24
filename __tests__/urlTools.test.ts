import { encodeUrl, decodeUrl, splitQuery } from '@apps/url-tools';

describe('url tools', () => {
  it('encodes and decodes text', () => {
    const text = 'hello world?=';
    const encoded = encodeUrl(text);
    expect(encoded).toBe('hello%20world%3F%3D');
    const decoded = decodeUrl(encoded);
    expect(decoded).toBe(text);
  });

  it('splits query parameters', () => {
    const url = 'https://example.com?foo=bar&baz=1';
    const result = splitQuery(url);
    expect(result).toEqual({ foo: 'bar', baz: '1' });
  });
});

