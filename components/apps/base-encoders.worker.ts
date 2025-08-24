import { base16, base32, base64, base64url } from 'rfc4648';
import bs58 from 'bs58';
import { bech32 } from 'bech32';
import ascii85 from 'ascii85';
import { TextEncoder as NodeTextEncoder, TextDecoder as NodeTextDecoder } from 'util';
import { webcrypto as nodeCrypto, createHash } from 'crypto';

const encoder = typeof TextEncoder !== 'undefined'
  ? new TextEncoder()
  : new NodeTextEncoder();
const decoder = typeof TextDecoder !== 'undefined'
  ? new TextDecoder()
  : new NodeTextDecoder();
const cryptoObj: Crypto | undefined =
  typeof crypto !== 'undefined' ? (crypto as any) : (nodeCrypto as any);

async function sha256(data: Uint8Array | ArrayBuffer): Promise<Uint8Array> {
  if (cryptoObj && cryptoObj.subtle) {
    const res = await cryptoObj.subtle.digest('SHA-256', data);
    return new Uint8Array(res);
  }
  const hash = createHash('sha256');
  hash.update(Buffer.from(data instanceof ArrayBuffer ? data : data.buffer));
  return new Uint8Array(hash.digest());
}
const PREVIEW_LIMIT = 256 * 1024; // 256 KiB

function toBytes(str: string): Uint8Array {
  return encoder.encode(str);
}

function fromBytes(bytes: Uint8Array): string {
  return decoder.decode(bytes);
}

async function encodeBase58Check(text: string): Promise<string> {
  const payload = toBytes(text);
  const hash1 = await sha256(payload);
  const hash2 = await sha256(hash1);
  const checksum = hash2.slice(0, 4);
  const buf = new Uint8Array(payload.length + 4);
  buf.set(payload);
  buf.set(checksum, payload.length);
  return bs58.encode(buf);
}

async function decodeBase58Check(data: string): Promise<string> {
  const bytes = bs58.decode(data);
  if (bytes.length < 4) throw new Error('Data too short');
  const payload = bytes.subarray(0, -4);
  const checksum = bytes.subarray(-4);
  const hash1 = await sha256(payload);
  const hash2 = await sha256(hash1);
  const expected = hash2.slice(0, 4);
  for (let i = 0; i < 4; i++)
    if (checksum[i] !== expected[i]) throw new Error('Invalid checksum');
  return fromBytes(payload);
}

function encodeAscii85(text: string): string {
  return ascii85.encode(toBytes(text)).toString();
}

function decodeAscii85(data: string): string {
  return fromBytes(ascii85.decode(data));
}

function encodeZ85(text: string): string {
  return ascii85.ZeroMQ.encode(toBytes(text)).toString();
}

function decodeZ85(data: string): string {
  return fromBytes(ascii85.ZeroMQ.decode(data));
}

function encodeBase36(text: string): string {
  const bytes = toBytes(text);
  let zeros = 0;
  while (zeros < bytes.length && bytes[zeros] === 0) zeros++;
  let hex = Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
  if (!hex) hex = '0';
  const value = BigInt('0x' + hex);
  const encoded = value.toString(36);
  return '0'.repeat(zeros) + encoded;
}

function decodeBase36(data: string): string {
  let zeros = 0;
  while (zeros < data.length && data[zeros] === '0') zeros++;
  const body = data.slice(zeros) || '0';
  let value = 0n;
  for (const c of body.toLowerCase()) {
    const digit = parseInt(c, 36);
    if (Number.isNaN(digit)) throw new Error('Invalid character');
    value = value * 36n + BigInt(digit);
  }
  let hex = value.toString(16);
  if (hex.length % 2) hex = '0' + hex;
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  }
  const result = new Uint8Array(zeros + bytes.length);
  result.set(bytes, zeros);
  return fromBytes(result);
}

function decodeBase64Stream(
  data: string,
  expanded: boolean
): { result: string; overLimit: boolean } {
  const chunkSize = 4 * 1024;
  let leftover = '';
  let overLimit = false;
  let decoded = '';
  let byteCount = 0;
  for (let i = 0; i < data.length; i += chunkSize) {
    let chunk = leftover + data.slice(i, i + chunkSize);
    const usable = chunk.length - (chunk.length % 4);
    leftover = chunk.slice(usable);
    if (usable) {
      const bin = atob(chunk.slice(0, usable));
      const bytes = new Uint8Array(bin.length);
      for (let j = 0; j < bin.length; j++) bytes[j] = bin.charCodeAt(j);
      byteCount += bytes.length;
      if (!expanded && byteCount > PREVIEW_LIMIT) {
        const slice = bytes.subarray(
          0,
          bytes.length - (byteCount - PREVIEW_LIMIT)
        );
        decoded += decoder.decode(slice, { stream: true });
        overLimit = true;
        return { result: decoded, overLimit };
      }
      decoded += decoder.decode(bytes, { stream: true });
    }
  }
  if (leftover) {
    const bin = atob(leftover);
    const bytes = new Uint8Array(bin.length);
    for (let j = 0; j < bin.length; j++) bytes[j] = bin.charCodeAt(j);
    byteCount += bytes.length;
    if (!expanded && byteCount > PREVIEW_LIMIT) {
      const slice = bytes.subarray(
        0,
        bytes.length - (byteCount - PREVIEW_LIMIT)
      );
      decoded += decoder.decode(slice);
      overLimit = true;
      return { result: decoded, overLimit };
    }
    decoded += decoder.decode(bytes);
  }
  if (expanded) {
    const bin = atob(data);
    const bytes = new Uint8Array(bin.length);
    for (let j = 0; j < bin.length; j++) bytes[j] = bin.charCodeAt(j);
    overLimit = bytes.length > PREVIEW_LIMIT;
    return { result: decoder.decode(bytes), overLimit };
  }
  return { result: decoded, overLimit };
}

if (typeof self !== 'undefined')
  self.onmessage = async (e: MessageEvent) => {
  const { id, codec, mode, data, expanded } = e.data as {
    id: number;
    codec: string;
    mode: 'encode' | 'decode';
    data: string;
    expanded?: boolean;
  };
  try {
    let result: string;
    let overLimit = false;
    switch (codec) {
      case 'base16':
        result =
          mode === 'encode'
            ? base16.stringify(toBytes(data))
            : fromBytes(base16.parse(data));
        break;
      case 'base32':
        result =
          mode === 'encode'
            ? base32.stringify(toBytes(data))
            : fromBytes(base32.parse(data));
        break;
      case 'base64':
        if (mode === 'encode') {
          result = base64.stringify(toBytes(data));
        } else {
          const r = decodeBase64Stream(data, !!expanded);
          result = r.result;
          overLimit = r.overLimit;
        }
        break;
      case 'base64url':
        result =
          mode === 'encode'
            ? base64url.stringify(toBytes(data))
            : fromBytes(base64url.parse(data));
        break;
      case 'base36':
        result =
          mode === 'encode' ? encodeBase36(data) : decodeBase36(data);
        break;
      case 'ascii85':
        result = mode === 'encode' ? encodeAscii85(data) : decodeAscii85(data);
        break;
      case 'z85':
        result = mode === 'encode' ? encodeZ85(data) : decodeZ85(data);
        break;
      case 'base58check':
        result =
          mode === 'encode'
            ? await encodeBase58Check(data)
            : await decodeBase58Check(data);
        break;
      case 'bech32':
        if (mode === 'encode') {
          const words = bech32.toWords(toBytes(data));
          result = bech32.encode('text', words);
        } else {
          const { words } = bech32.decode(data);
          const bytes = bech32.fromWords(words);
          result = fromBytes(Uint8Array.from(bytes));
        }
        break;
      default:
        throw new Error('Unsupported codec');
    }
    if (typeof self !== 'undefined')
      self.postMessage({ id, result, overLimit });
  } catch (err: any) {
    if (typeof self !== 'undefined')
      self.postMessage({ id, error: err.message || String(err) });
  }
};

export {
  encodeBase58Check,
  decodeBase58Check,
  encodeAscii85,
  decodeAscii85,
  encodeZ85,
  decodeZ85,
  decodeBase64Stream,
  encodeBase36,
  decodeBase36,
};

