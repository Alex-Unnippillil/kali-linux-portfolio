import React, { useEffect, useState } from 'react';
import { bech32 } from 'bech32';
import bs58 from 'bs58';
import ascii85 from 'ascii85';
import { base16, base32, base64 } from 'rfc4648';

const BASE64_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
const BASE32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
const BASE16_ALPHABET = '0123456789abcdefABCDEF';
const BASE58_ALPHABET = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
const ASCII85_ALPHABET = (() => {
  const chars: string[] = [];
  for (let i = 33; i <= 117; i++) chars.push(String.fromCharCode(i));
  return chars.join('');
})();
const BASE85_ALPHABET = ascii85.ZeroMQ._options.table.join('');
const PREVIEW_LIMIT = 256 * 1024; // 256 KiB

type Mode = 'encode' | 'decode';
type Codec =
  | 'base16'
  | 'base32'
  | 'base64'
  | 'base85'
  | 'ascii85'
  | 'base58'
  | 'bech32';

type ValidationError = { index?: number; message: string } | null;

function validateBase64(data: string): ValidationError {
  for (let i = 0; i < data.length; i++) {
    const c = data[i];
    if (c === '=') {
      const rest = data.slice(i);
      if (!/^=+$/.test(rest)) return { index: i, message: 'Unexpected padding character' };
      if (data.length % 4 !== 0) return { index: i, message: 'Invalid padding length' };
      break;
    }
    if (!BASE64_ALPHABET.includes(c)) return { index: i, message: `Invalid character '${c}'` };
  }
  if (data.length % 4 !== 0) return { index: data.length - 1, message: 'Invalid length (must be multiple of 4)' };
  return null;
}

function validateBase32(data: string): ValidationError {
  for (let i = 0; i < data.length; i++) {
    const c = data[i];
    if (c === '=') {
      const rest = data.slice(i);
      if (!/^=+$/.test(rest)) return { index: i, message: 'Unexpected padding character' };
      if (data.length % 8 !== 0) return { index: i, message: 'Invalid padding length' };
      break;
    }
    if (!BASE32_ALPHABET.includes(c.toUpperCase()))
      return { index: i, message: `Invalid character '${c}'` };
  }
  if (data.length % 8 !== 0) return { index: data.length - 1, message: 'Invalid length (must be multiple of 8)' };
  return null;
}

function validateBase16(data: string): ValidationError {
  for (let i = 0; i < data.length; i++) {
    const c = data[i];
    if (!BASE16_ALPHABET.includes(c)) return { index: i, message: `Invalid character '${c}'` };
  }
  if (data.length % 2 !== 0) return { index: data.length - 1, message: 'Odd length (invalid padding)' };
  return null;
}

function validateAlphabet(data: string, alphabet: string): ValidationError {
  for (let i = 0; i < data.length; i++) {
    if (!alphabet.includes(data[i])) return { index: i, message: `Invalid character '${data[i]}'` };
  }
  return null;
}

function validateBech32(data: string): ValidationError {
  const sep = data.lastIndexOf('1');
  if (sep === -1) return { index: data.length - 1, message: 'Missing separator' };
  const hrp = data.slice(0, sep);
  if (!hrp) return { index: 0, message: 'Human-readable part required' };
  for (let i = 0; i < hrp.length; i++) {
    const c = hrp[i];
    if (c < '\x21' || c > '\x7e' || c !== c.toLowerCase())
      return { index: i, message: 'Invalid HRP character' };
  }
  const dataPart = data.slice(sep + 1);
  for (let i = 0; i < dataPart.length; i++) {
    const c = dataPart[i];
    if (!'qpzry9x8gf2tvdw0s3jn54khce6mua7l'.includes(c))
      return { index: sep + 1 + i, message: `Invalid character '${c}'` };
  }
  try {
    bech32.decode(data);
  } catch {
    return { index: sep + 1, message: 'Invalid checksum' };
  }
  return null;
}

function validate(codec: Codec, mode: Mode, data: string): ValidationError {
  if (mode === 'encode' || !data) return null;
  switch (codec) {
    case 'base64':
      return validateBase64(data);
    case 'base32':
      return validateBase32(data);
    case 'base16':
      return validateBase16(data);
    case 'base58':
      return validateAlphabet(data, BASE58_ALPHABET);
    case 'ascii85':
      return validateAlphabet(data, ASCII85_ALPHABET);
    case 'base85':
      return validateAlphabet(data, BASE85_ALPHABET);
    case 'bech32':
      return validateBech32(data);
  }
}

function decodeBase64Stream(data: string, expanded: boolean): { text: string; overLimit: boolean } {
  const bytes: number[] = [];
  let overLimit = false;
  for (let i = 0; i < data.length; i += 4) {
    const chunk = data.slice(i, i + 4);
    const buf = Buffer.from(chunk, 'base64');
    for (const b of buf) {
      if (!expanded && bytes.length >= PREVIEW_LIMIT) {
        overLimit = true;
        break;
      }
      bytes.push(b);
    }
    if (!expanded && overLimit) break;
  }
  if (expanded) {
    // determine if more data existed
    const full = Buffer.from(data, 'base64');
    overLimit = full.length > PREVIEW_LIMIT;
    return { text: full.toString('utf8'), overLimit };
  }
  return { text: Buffer.from(bytes).toString('utf8'), overLimit };
}

const codecs = {
  base16: {
    encode: (text: string) => base16.stringify(Buffer.from(text, 'utf8')),
    decode: (data: string) => Buffer.from(base16.parse(data)).toString('utf8'),
  },
  base32: {
    encode: (text: string) => base32.stringify(Buffer.from(text, 'utf8')),
    decode: (data: string) => Buffer.from(base32.parse(data)).toString('utf8'),
  },
  base64: {
    encode: (text: string) => base64.stringify(Buffer.from(text, 'utf8')),
    decode: (data: string, expanded: boolean) => decodeBase64Stream(data, expanded),
  },
  base85: {
    encode: (text: string) =>
      ascii85.ZeroMQ.encode(Buffer.from(text, 'utf8')).toString(),
    decode: (data: string) =>
      Buffer.from(ascii85.ZeroMQ.decode(data)).toString('utf8'),
  },
  ascii85: {
    encode: (text: string) => ascii85.encode(Buffer.from(text, 'utf8')).toString(),
    decode: (data: string) => ascii85.decode(data).toString(),
  },
  base58: {
    encode: (text: string) => bs58.encode(Buffer.from(text, 'utf8')),
    decode: (data: string) => Buffer.from(bs58.decode(data)).toString('utf8'),
  },
  bech32: {
    encode: (text: string) => {
      const words = bech32.toWords(Buffer.from(text, 'utf8'));
      return bech32.encode('text', words);
    },
    decode: (data: string) => {
      const { words } = bech32.decode(data);
      const bytes = bech32.fromWords(words);
      return Buffer.from(bytes).toString('utf8');
    },
  },
} as const;

const BaseEncoders = () => {
  const [codec, setCodec] = useState<Codec>('bech32');
  const [mode, setMode] = useState<Mode>('encode');
  const [input, setInput] = useState('');
  const [debounced, setDebounced] = useState('');
  const [output, setOutput] = useState('');
  const [error, setError] = useState('');
  const [errorIndex, setErrorIndex] = useState<number | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [overLimit, setOverLimit] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(input), 300);
    return () => clearTimeout(t);
  }, [input]);

  useEffect(() => {
    if (!debounced) {
      setOutput('');
      setError('');
      setErrorIndex(null);
      setOverLimit(false);
      return;
    }
    const v = validate(codec, mode, debounced);
    if (v) {
      setError(v.message);
      setErrorIndex(v.index ?? null);
      setOutput('');
      setOverLimit(false);
      return;
    }
    try {
      if (codec === 'base64' && mode === 'decode') {
        const { text, overLimit: o } = codecs.base64.decode(debounced, expanded);
        setOutput(text);
        setOverLimit(o);
      } else {
        const result = (codecs as any)[codec][mode](debounced);
        setOutput(result);
        setOverLimit(false);
      }
      setError('');
      setErrorIndex(null);
    } catch (e: any) {
      setError(e.message || 'Conversion failed');
      setErrorIndex(null);
      setOutput('');
      setOverLimit(false);
    }
  }, [debounced, codec, mode, expanded]);

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    setExpanded(false);
  };

  return (
    <div className="h-full w-full p-4 bg-gray-900 text-white flex flex-col">
      <div className="mb-2 flex flex-wrap gap-2">
        <select
          className="px-2 py-1 rounded text-black"
          value={codec}
          onChange={(e) => {
            setCodec(e.target.value as Codec);
            setExpanded(false);
          }}
        >
          <option value="base16">Base16</option>
          <option value="base32">Base32</option>
          <option value="base64">Base64</option>
          <option value="base85">Base85</option>
          <option value="ascii85">Ascii85</option>
          <option value="base58">Base58</option>
          <option value="bech32">Bech32</option>
        </select>
        <select
          className="px-2 py-1 rounded text-black"
          value={mode}
          onChange={(e) => {
            setMode(e.target.value as Mode);
            setExpanded(false);
          }}
        >
          <option value="encode">Encode</option>
          <option value="decode">Decode</option>
        </select>
      </div>
      {error && <div className="text-red-500 mb-2">{error}</div>}
      <div className="relative w-full h-32 mb-2">
        <textarea
          value={input}
          onChange={handleInput}
          placeholder="Input"
          className="absolute inset-0 w-full h-full p-2 rounded text-black font-mono"
        />
        {errorIndex !== null && (
          <div className="pointer-events-none absolute inset-0 p-2 font-mono whitespace-pre-wrap">
            <span className="invisible">{input.slice(0, errorIndex)}</span>
            <span className="bg-red-500 text-white">{input[errorIndex]}</span>
          </div>
        )}
      </div>
      {overLimit && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="mb-2 px-2 py-1 bg-gray-700 rounded self-start"
        >
          {expanded ? 'Collapse' : 'Expand'}
        </button>
      )}
      <textarea
        value={output}
        readOnly
        placeholder="Output"
        className="w-full h-32 p-2 rounded text-black font-mono"
      />
    </div>
  );
};

export default BaseEncoders;
export const displayBaseEncoders = () => <BaseEncoders />;
