import React, { useEffect, useRef, useState } from 'react';
import { bech32 } from 'bech32';
import bs58 from 'bs58';
import ascii85 from 'ascii85';
import { diffWords } from 'diff';
import QRCode from 'qrcode';
import { base16, base32, base64, base64url } from 'rfc4648';

const BASE64_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
const BASE64URL_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
const BASE32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
const BASE16_ALPHABET = '0123456789abcdefABCDEF';
const BASE58_ALPHABET = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
const ASCII85_ALPHABET = (() => {
  const chars: string[] = [];
  for (let i = 33; i <= 117; i++) chars.push(String.fromCharCode(i));
  return chars.join('');
})();
const BASE85_ALPHABET = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz!#$%&()*+-;<=>?@^_`{|}~';
const Z85_ALPHABET = ascii85.ZeroMQ._options.table.join('');
const RFC1924_CODEC = new (ascii85 as any).Ascii85({ table: BASE85_ALPHABET.split('') });
const PREVIEW_LIMIT = 256 * 1024; // 256 KiB

type Mode = 'encode' | 'decode';
type Codec =
  | 'base16'
  | 'base32'
  | 'base64'
  | 'base64url'
  | 'base85'
  | 'ascii85'
  | 'z85'
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

function validateBase64url(data: string): ValidationError {
  for (let i = 0; i < data.length; i++) {
    const c = data[i];
    if (c === '=') {
      const rest = data.slice(i);
      if (!/^=+$/.test(rest)) return { index: i, message: 'Unexpected padding character' };
      if (data.length % 4 !== 0) return { index: i, message: 'Invalid padding length' };
      break;
    }
    if (!BASE64URL_ALPHABET.includes(c))
      return { index: i, message: `Invalid character '${c}'` };
  }
  if (data.length % 4 !== 0)
    return { index: data.length - 1, message: 'Invalid length (must be multiple of 4)' };
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
    case 'base64url':
      return validateBase64url(data);
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
    case 'z85':
      return validateAlphabet(data, Z85_ALPHABET);
    case 'bech32':
      return validateBech32(data);
  }
}

function detectCodec(data: string): Codec | null {
  const str = data.trim();
  if (/^[A-Za-z0-9+/]+={0,2}$/.test(str)) return 'base64';
  if (/^[A-Za-z0-9\-_]+={0,2}$/.test(str)) return 'base64url';
  if (/^[A-Z2-7]+=*$/.test(str)) return 'base32';
  if (/^[0-9A-Za-z!#$%&()*+\-;<=>?@^_`{|}~]+$/.test(str)) return 'base85';
  if (/^[!-u\s]+$/.test(str)) return 'ascii85';
  if (/^[0-9A-Za-z\.\-:+=\^!\/\*?&<>()\[\]{}@%$#]+$/.test(str)) return 'z85';
  if (/^[123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz]+$/.test(str))
    return 'base58';
  if (/^[^\s]+1[qpzry9x8gf2tvdw0s3jn54khce6mua7l]+$/.test(str)) return 'bech32';
  if (/^[0-9A-Fa-f]+$/.test(str) && str.length % 2 === 0) return 'base16';
  return null;
}

async function decodeBase64Stream(
  data: string,
  expanded: boolean,
): Promise<{ text: string; overLimit: boolean }> {
  const chunkSize = 4 * 1024;
  const stream = new ReadableStream<string>({
    start(controller) {
      for (let i = 0; i < data.length; i += chunkSize) {
        controller.enqueue(data.slice(i, i + chunkSize));
      }
      controller.close();
    },
  });
  const reader = stream.getReader();
  const bytes: number[] = [];
  let leftover = '';
  let overLimit = false;
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    const chunk = leftover + value;
    const usable = chunk.length - (chunk.length % 4);
    leftover = chunk.slice(usable);
    const buf = Buffer.from(chunk.slice(0, usable), 'base64');
    for (const b of buf) {
      if (!expanded && bytes.length >= PREVIEW_LIMIT) {
        overLimit = true;
        break;
      }
      bytes.push(b);
    }
    if (!expanded && overLimit) break;
  }
  if (leftover) {
    const buf = Buffer.from(leftover, 'base64');
    for (const b of buf) {
      if (!expanded && bytes.length >= PREVIEW_LIMIT) {
        overLimit = true;
        break;
      }
      bytes.push(b);
    }
  }
  if (expanded) {
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
    decode: (data: string, expanded = false) => decodeBase64Stream(data, expanded),
  },
  base64url: {
    encode: (text: string) => base64url.stringify(Buffer.from(text, 'utf8')),
    decode: (data: string) => Buffer.from(base64url.parse(data)).toString('utf8'),
  },
  base85: {
    encode: (text: string) =>
      RFC1924_CODEC.encode(Buffer.from(text, 'utf8')).toString(),
    decode: (data: string) =>
      Buffer.from(RFC1924_CODEC.decode(data)).toString('utf8'),
  },
  ascii85: {
    encode: (text: string) => ascii85.encode(Buffer.from(text, 'utf8')).toString(),
    decode: (data: string) => ascii85.decode(data).toString(),
  },
  z85: {
    encode: (text: string) =>
      ascii85.ZeroMQ.encode(Buffer.from(text, 'utf8')).toString(),
    decode: (data: string) =>
      Buffer.from(ascii85.ZeroMQ.decode(data)).toString('utf8'),
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

const docs: Record<Codec, { alphabet: string; padding: string }> = {
  base16: { alphabet: BASE16_ALPHABET, padding: 'none' },
  base32: { alphabet: BASE32_ALPHABET, padding: '=' },
  base64: { alphabet: BASE64_ALPHABET, padding: '=' },
  base64url: { alphabet: BASE64URL_ALPHABET, padding: '=' },
  base85: { alphabet: BASE85_ALPHABET, padding: 'none' },
  ascii85: { alphabet: ASCII85_ALPHABET, padding: 'none' },
  z85: { alphabet: Z85_ALPHABET, padding: 'none' },
  base58: { alphabet: BASE58_ALPHABET, padding: 'none' },
  bech32: {
    alphabet: 'qpzry9x8gf2tvdw0s3jn54khce6mua7l',
    padding: 'checksum',
  },
};

const BaseEncoders = () => {
  const [codec, setCodec] = useState<Codec>('base64');
  const [mode, setMode] = useState<Mode>('encode');
  const [input, setInput] = useState('');
  const [debounced, setDebounced] = useState('');
  const [output, setOutput] = useState('');
  const [error, setError] = useState('');
  const [errorIndex, setErrorIndex] = useState<number | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [overLimit, setOverLimit] = useState(false);
  const [diffParts, setDiffParts] = useState<ReturnType<typeof diffWords>>([]);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(input), 300);
    return () => clearTimeout(t);
  }, [input]);

  useEffect(() => {
    let cancelled = false;
    async function run() {
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
          const { text, overLimit: o } = await codecs.base64.decode(
            debounced,
            expanded,
          );
          if (!cancelled) {
            setOutput(text);
            setOverLimit(o);
          }
        } else {
          const fn = (codecs as any)[codec][mode];
          const result = await Promise.resolve(fn(debounced));
          if (!cancelled) {
            setOutput(result);
            setOverLimit(false);
          }
        }
        if (!cancelled) {
          setError('');
          setErrorIndex(null);
        }
      } catch (e: any) {
        if (!cancelled) {
          setError(e.message || 'Conversion failed');
          setErrorIndex(null);
          setOutput('');
          setOverLimit(false);
        }
      }
    }
    run();
    return () => {
      cancelled = true;
    };
  }, [debounced, codec, mode, expanded]);

  useEffect(() => {
    let cancelled = false;
    async function rt() {
      if (!input || !output) {
        setDiffParts([]);
        return;
      }
      try {
        const fn = mode === 'encode'
          ? (codecs as any)[codec].decode
          : (codecs as any)[codec].encode;
        const res: any = await Promise.resolve(fn(output));
        const text = typeof res === 'string' ? res : res.text;
        if (!cancelled) setDiffParts(diffWords(input, text));
      } catch {
        if (!cancelled) setDiffParts([]);
      }
    }
    rt();
    return () => {
      cancelled = true;
    };
  }, [input, output, mode, codec]);

  useEffect(() => {
    if (output && output.length <= 256 && canvasRef.current) {
      QRCode.toCanvas(canvasRef.current, output).catch(() => {});
    } else if (canvasRef.current) {
      const ctx = canvasRef.current.getContext('2d');
      if (ctx) ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    }
  }, [output]);

  const copy = async (val: string) => {
    if (!val) return;
    try {
      await navigator.clipboard.writeText(val);
    } catch {
      // ignore
    }
  };

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    setExpanded(false);
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const text = e.clipboardData.getData('text');
    const detected = detectCodec(text);
    if (detected && detected !== codec) {
      setCodec(detected);
      setError(`Detected ${detected} data`);
    }
    setInput(text);
    setExpanded(false);
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent<HTMLTextAreaElement>) => {
    e.preventDefault();
    const text = e.dataTransfer.getData('text');
    const detected = detectCodec(text);
    if (detected && detected !== codec) {
      setCodec(detected);
      setError(`Detected ${detected} data`);
    }
    setInput(text);
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
          <option value="base64">Base64 MIME</option>
          <option value="base64url">Base64 URL</option>
          <option value="base85">Base85</option>
          <option value="ascii85">Ascii85</option>
          <option value="z85">Z85</option>
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
      <div className="mb-2 text-sm">
        <div>
          Alphabet: <code className="break-all">{docs[codec].alphabet}</code>
        </div>
        <div>Padding: {docs[codec].padding}</div>
      </div>
      {error && <div className="text-red-500 mb-2">{error}</div>}
      <div className="relative w-full h-32 mb-2">
        <textarea
          value={input}
          onChange={handleInput}
          onPaste={handlePaste}
          onDrop={handleDrop}
          onDragOver={(e) => e.preventDefault()}
          placeholder="Input"
          className="absolute inset-0 w-full h-full p-2 rounded text-black font-mono"
        />
        <button
          onClick={() => copy(input)}
          className="absolute top-1 right-1 bg-gray-700 px-1 rounded"
        >
          Copy
        </button>
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
      <div className="relative w-full h-32 mb-2">
        <textarea
          value={output}
          readOnly
          placeholder="Output"
          className="absolute inset-0 w-full h-full p-2 rounded text-black font-mono"
        />
        <button
          onClick={() => copy(output)}
          className="absolute top-1 right-1 bg-gray-700 px-1 rounded"
        >
          Copy
        </button>
      </div>
      {output && output.length <= 256 && (
        <canvas ref={canvasRef} className="mb-2" />
      )}
      {diffParts.length > 1 && (
        <div className="mb-2 p-2 bg-gray-800 font-mono text-sm overflow-auto">
          {diffParts.map((part, i) => (
            <span
              // eslint-disable-next-line react/no-array-index-key
              key={i}
              className={part.added ? 'bg-green-500/30' : part.removed ? 'bg-red-500/30' : ''}
            >
              {part.value}
            </span>
          ))}
        </div>
      )}
    </div>
  );
};

export default BaseEncoders;
export const displayBaseEncoders = () => <BaseEncoders />;
