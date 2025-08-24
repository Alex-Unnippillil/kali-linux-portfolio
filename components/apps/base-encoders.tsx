import React, { useEffect, useRef, useState } from 'react';
import { bech32 } from 'bech32';
import ascii85 from 'ascii85';
import { diffWords } from 'diff';
import QRCode from 'qrcode';

const BASE64_ALPHABET =
  'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
const BASE64URL_ALPHABET =
  'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
const BASE32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
const BASE16_ALPHABET = '0123456789abcdefABCDEF';
const BASE58_ALPHABET =
  '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
const ASCII85_ALPHABET = (() => {
  const chars: string[] = [];
  for (let i = 33; i <= 117; i++) chars.push(String.fromCharCode(i));
  return chars.join('');
})();
const Z85_ALPHABET = ascii85.ZeroMQ._options.table.join('');

type Mode = 'encode' | 'decode';
type Codec =
  | 'base16'
  | 'base32'
  | 'base64'
  | 'base64url'
  | 'ascii85'
  | 'z85'
  | 'base58check'
  | 'bech32';

type ValidationError = { index?: number; message: string } | null;

function validateBase64(data: string): ValidationError {
  for (let i = 0; i < data.length; i++) {
    const c = data[i];
    if (c === '=') {
      const rest = data.slice(i);
      if (!/^=+$/.test(rest))
        return { index: i, message: 'Unexpected padding character' };
      if (data.length % 4 !== 0)
        return { index: i, message: 'Invalid padding length' };
      break;
    }
    if (!BASE64_ALPHABET.includes(c))
      return { index: i, message: `Invalid character '${c}'` };
  }
  if (data.length % 4 !== 0)
    return {
      index: data.length - 1,
      message: 'Invalid length (must be multiple of 4)',
    };
  return null;
}

function validateBase64url(data: string): ValidationError {
  for (let i = 0; i < data.length; i++) {
    const c = data[i];
    if (c === '=') {
      const rest = data.slice(i);
      if (!/^=+$/.test(rest))
        return { index: i, message: 'Unexpected padding character' };
      if (data.length % 4 !== 0)
        return { index: i, message: 'Invalid padding length' };
      break;
    }
    if (!BASE64URL_ALPHABET.includes(c))
      return { index: i, message: `Invalid character '${c}'` };
  }
  if (data.length % 4 !== 0)
    return {
      index: data.length - 1,
      message: 'Invalid length (must be multiple of 4)',
    };
  return null;
}

function validateBase32(data: string): ValidationError {
  for (let i = 0; i < data.length; i++) {
    const c = data[i];
    if (c === '=') {
      const rest = data.slice(i);
      if (!/^=+$/.test(rest))
        return { index: i, message: 'Unexpected padding character' };
      if (data.length % 8 !== 0)
        return { index: i, message: 'Invalid padding length' };
      break;
    }
    if (!BASE32_ALPHABET.includes(c.toUpperCase()))
      return { index: i, message: `Invalid character '${c}'` };
  }
  if (data.length % 8 !== 0)
    return {
      index: data.length - 1,
      message: 'Invalid length (must be multiple of 8)',
    };
  return null;
}

function validateBase16(data: string): ValidationError {
  for (let i = 0; i < data.length; i++) {
    const c = data[i];
    if (!BASE16_ALPHABET.includes(c))
      return { index: i, message: `Invalid character '${c}'` };
  }
  if (data.length % 2 !== 0)
    return { index: data.length - 1, message: 'Odd length (invalid padding)' };
  return null;
}

function validateAlphabet(data: string, alphabet: string): ValidationError {
  for (let i = 0; i < data.length; i++) {
    if (!alphabet.includes(data[i]))
      return { index: i, message: `Invalid character '${data[i]}'` };
  }
  return null;
}

function validateBech32(data: string): ValidationError {
  const sep = data.lastIndexOf('1');
  if (sep === -1)
    return { index: data.length - 1, message: 'Missing separator' };
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
    case 'base58check':
      return validateAlphabet(data, BASE58_ALPHABET);
    case 'ascii85':
      return validateAlphabet(data, ASCII85_ALPHABET);
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
  if (/^[!-u\s]+$/.test(str)) return 'ascii85';
  if (/^[0-9A-Za-z\.\-:+=\^!\/\*?&<>()\[\]{}@%$#]+$/.test(str)) return 'z85';
  if (
    /^[123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz]+$/.test(str)
  )
    return 'base58check';
  if (/^[^\s]+1[qpzry9x8gf2tvdw0s3jn54khce6mua7l]+$/.test(str)) return 'bech32';
  if (/^[0-9A-Fa-f]+$/.test(str) && str.length % 2 === 0) return 'base16';
  return null;
}

const docs: Record<
  Codec,
  { alphabet: string; padding: string; tooltip: string; checksum: string }
> = {
  base16: {
    alphabet: BASE16_ALPHABET,
    padding: 'none',
    tooltip: 'Hexadecimal encoding',
    checksum: 'none',
  },
  base32: {
    alphabet: BASE32_ALPHABET,
    padding: '=',
    tooltip: 'RFC 4648 Base32',
    checksum: 'none',
  },
  base64: {
    alphabet: BASE64_ALPHABET,
    padding: '=',
    tooltip: 'RFC 4648 Base64',
    checksum: 'none',
  },
  base64url: {
    alphabet: BASE64URL_ALPHABET,
    padding: '=',
    tooltip: 'URL-safe Base64',
    checksum: 'none',
  },
  ascii85: {
    alphabet: ASCII85_ALPHABET,
    padding: 'none',
    tooltip: 'Adobe Ascii85',
    checksum: 'none',
  },
  z85: {
    alphabet: Z85_ALPHABET,
    padding: 'none',
    tooltip: 'ZeroMQ Z85',
    checksum: 'none',
  },
  base58check: {
    alphabet: BASE58_ALPHABET,
    padding: 'checksum',
    tooltip: 'Base58 with 4-byte checksum',
    checksum: '4-byte double SHA-256',
  },
  bech32: {
    alphabet: 'qpzry9x8gf2tvdw0s3jn54khce6mua7l',
    padding: 'checksum',
    tooltip: 'BIP-0173 Bech32',
    checksum: '6-char polymod',
  },
};

const codecOptions: { value: Codec; label: string }[] = [
  { value: 'base16', label: 'Base16' },
  { value: 'base32', label: 'Base32' },
  { value: 'base64', label: 'Base64 MIME' },
  { value: 'base64url', label: 'Base64 URL' },
  { value: 'base58check', label: 'Base58Check' },
  { value: 'ascii85', label: 'Ascii85' },
  { value: 'z85', label: 'Z85' },
  { value: 'bech32', label: 'Bech32' },
];

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
  const workerRef = useRef<Worker>();
  const callbacks = useRef<Map<number, (value: any) => void>>(new Map());

  useEffect(() => {
    workerRef.current = new Worker(
      new URL('./base-encoders.worker.ts', import.meta.url)
    );
    workerRef.current.onmessage = (e: MessageEvent) => {
      const cb = callbacks.current.get(e.data.id);
      if (cb) {
        cb(e.data);
        callbacks.current.delete(e.data.id);
      }
    };
    return () => workerRef.current?.terminate();
  }, []);

  const callWorker = (payload: any) =>
    new Promise<any>((resolve) => {
      const id = Math.random();
      callbacks.current.set(id, resolve);
      workerRef.current?.postMessage({ id, ...payload });
    });

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
        const res: any = await callWorker({
          codec,
          mode,
          data: debounced,
          expanded,
        });
        if (!cancelled) {
          if (res.error) {
            setError(res.error);
            setErrorIndex(null);
            setOutput('');
            setOverLimit(false);
          } else {
            setOutput(res.result);
            setOverLimit(res.overLimit);
            setError('');
            setErrorIndex(null);
          }
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
        const res: any = await callWorker({
          codec,
          mode: mode === 'encode' ? 'decode' : 'encode',
          data: output,
          expanded: true,
        });
        if (!cancelled) setDiffParts(diffWords(input, res.result));
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
      if (ctx)
        ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
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
          {codecOptions.map((opt) => (
            <option
              key={opt.value}
              value={opt.value}
              title={docs[opt.value].tooltip}
            >
              {opt.label}
            </option>
          ))}
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
        <div>Checksum: {docs[codec].checksum}</div>
      </div>
      {error && <div className="text-red-500 mb-2">{error}</div>}
      <div className="flex flex-1 gap-2 h-64 mb-2">
        <div className="relative w-1/2 h-full">
          <textarea
            value={input}
            onChange={handleInput}
            onPaste={handlePaste}
            onDrop={handleDrop}
            onDragOver={(e) => e.preventDefault()}
            placeholder="Input"
            className="absolute inset-0 w-full h-full p-2 rounded text-black font-mono resize-none"
          />
          <button
            onClick={() => copy(input)}
            className="absolute top-1 right-1 bg-gray-700 px-1 rounded"
          >
            Copy
          </button>
          {errorIndex !== null && (
            <div className="absolute inset-0 p-2 font-mono whitespace-pre-wrap pointer-events-none">
              <span className="invisible">{input.slice(0, errorIndex)}</span>
              <span className="relative bg-red-500 text-white pointer-events-auto group">
                {input[errorIndex]}
                <span className="hidden group-hover:block absolute -top-6 left-0 bg-red-600 text-white text-xs p-1 rounded shadow">
                  Byte {errorIndex}: {error}
                </span>
              </span>
            </div>
          )}
        </div>
        <div className="relative w-1/2 h-full">
          <textarea
            value={output}
            readOnly
            placeholder="Output"
            className="absolute inset-0 w-full h-full p-2 rounded text-black font-mono resize-none"
          />
          <button
            onClick={() => copy(output)}
            className="absolute top-1 right-1 bg-gray-700 px-1 rounded"
          >
            Copy
          </button>
        </div>
      </div>
      {overLimit && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="mb-2 px-2 py-1 bg-gray-700 rounded self-start"
        >
          {expanded ? 'Collapse' : 'Expand'}
        </button>
      )}
      {output && output.length <= 256 && (
        <canvas ref={canvasRef} className="mb-2" />
      )}
      {diffParts.length > 1 && (
        <div className="mb-2 p-2 bg-gray-800 font-mono text-sm overflow-auto">
          {diffParts.map((part, i) => (
            <span
              // eslint-disable-next-line react/no-array-index-key
              key={i}
              className={
                part.added
                  ? 'bg-green-500/30'
                  : part.removed
                    ? 'bg-red-500/30'
                    : ''
              }
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
