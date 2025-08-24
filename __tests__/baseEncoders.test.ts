import { base16, base32, base64, base64url } from 'rfc4648';
import { bech32 } from 'bech32';
import { TextEncoder, TextDecoder } from 'util';
import { webcrypto } from 'crypto';

(global as any).crypto = webcrypto;
const {
  encodeAscii85,
  decodeAscii85,
  encodeZ85,
  decodeZ85,
  encodeBase36,
  decodeBase36,
  decodeBase64Stream,
} = require('@components/apps/base-encoders.worker');
const { detectCodec } = require('@components/apps/base-encoders');
const bs58 = require('bs58').default;

describe('base algorithm roundtrips', () => {
  const text = 'hello world';

  it('base16', () => {
    const encoded = base16.stringify(new TextEncoder().encode(text));
    const decoded = new TextDecoder().decode(base16.parse(encoded));
    expect(decoded).toBe(text);
  });

  it('base32', () => {
    const encoded = base32.stringify(new TextEncoder().encode(text));
    const decoded = new TextDecoder().decode(base32.parse(encoded));
    expect(decoded).toBe(text);
  });

  it('base36', () => {
    const encoded = encodeBase36(text);
    const decoded = decodeBase36(encoded);
    expect(decoded).toBe(text);
  });

  it('base64', () => {
    const encoded = base64.stringify(new TextEncoder().encode(text));
    const { result } = decodeBase64Stream(encoded, true);
    expect(result).toBe(text);
  });

  it('base64url', () => {
    const encoded = base64url.stringify(new TextEncoder().encode(text));
    const decoded = new TextDecoder().decode(base64url.parse(encoded));
    expect(decoded).toBe(text);
  });

  it('ascii85', () => {
    const encoded = encodeAscii85(text);
    const decoded = decodeAscii85(encoded);
    expect(decoded).toBe(text);
  });

  it('z85', () => {
    const encoded = encodeZ85(text);
    const decoded = decodeZ85(encoded);
    expect(decoded).toBe(text);
  });

  it('base58', () => {
    const encoded = bs58.encode(new TextEncoder().encode(text));
    const decoded = new TextDecoder().decode(bs58.decode(encoded));
    expect(decoded).toBe(text);
  });

  it('bech32', () => {
    const words = bech32.toWords(new TextEncoder().encode(text));
    const encoded = bech32.encode('text', words);
    const { words: decWords } = bech32.decode(encoded);
    const decoded = new TextDecoder().decode(
      Uint8Array.from(bech32.fromWords(decWords))
    );
    expect(decoded).toBe(text);
  });
});

describe('codec detection', () => {
  it('detects base64', () => {
    expect(detectCodec('SGVsbG8=')).toBe('base64');
  });
});

describe('base64 streaming decode', () => {
  it('limits preview size', () => {
    const size = 256 * 1024 + 10;
    const bytes = new Uint8Array(size).fill(65); // 'A'
    const encoded = base64.stringify(bytes);
    const res = decodeBase64Stream(encoded, false);
    expect(res.overLimit).toBe(true);
    expect(res.result.length).toBe(256 * 1024);
  });
});
