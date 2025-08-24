import {
  encodeUrl,
  decodeUrl,
  splitQuery,
  normalizeUrl,
  signUrl,
  parseUrl,
} from '@apps/url-tools';
import { webcrypto } from 'crypto';
import { TextEncoder } from 'util';

// Polyfill for Node test environment
// @ts-ignore
global.TextEncoder = TextEncoder;
// @ts-ignore
global.crypto = webcrypto;

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

  it('normalizes IDNA hostnames', () => {
    const url = 'https://mañana.com/../a';
    expect(normalizeUrl(url)).toBe('https://xn--maana-pta.com/a');
  });

  it('parses unicode hostnames', () => {
    const info = parseUrl('https://xn--maana-pta.com');
    expect(info?.hostUnicode).toBe('mañana.com');
  });

  it('signs urls', async () => {
    const signed = await signUrl('https://example.com/path?a=1&b=2', 'secret');
    const u = new URL(signed);
    expect(u.searchParams.get('signature')).toBeTruthy();
  });
});

