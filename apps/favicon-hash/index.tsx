import React, { useState, useCallback, useRef } from 'react';

function murmurhash3_32_gc(key: string, seed = 0): string {
  let remainder = key.length & 3;
  const bytes = key.length - remainder;
  let h1 = seed;
  const c1 = 0xcc9e2d51;
  const c2 = 0x1b873593;
  let i = 0;
  let k1 = 0;

  while (i < bytes) {
    k1 =
      (key.charCodeAt(i) & 0xff) |
      ((key.charCodeAt(++i) & 0xff) << 8) |
      ((key.charCodeAt(++i) & 0xff) << 16) |
      ((key.charCodeAt(++i) & 0xff) << 24);
    ++i;

    k1 = (k1 * c1) | 0;
    k1 = (k1 << 15) | (k1 >>> 17);
    k1 = (k1 * c2) | 0;

    h1 ^= k1;
    h1 = (h1 << 13) | (h1 >>> 19);
    h1 = (h1 * 5 + 0xe6546b64) | 0;
  }

  k1 = 0;

  switch (remainder) {
    case 3:
      k1 ^= (key.charCodeAt(i + 2) & 0xff) << 16;
    // eslint-disable-next-line no-fallthrough
    case 2:
      k1 ^= (key.charCodeAt(i + 1) & 0xff) << 8;
    // eslint-disable-next-line no-fallthrough
    case 1:
      k1 ^= key.charCodeAt(i) & 0xff;
      k1 = (k1 * c1) | 0;
      k1 = (k1 << 15) | (k1 >>> 17);
      k1 = (k1 * c2) | 0;
      h1 ^= k1;
  }

  h1 ^= key.length;
  h1 ^= h1 >>> 16;
  h1 = (h1 * 0x85ebca6b) | 0;
  h1 ^= h1 >>> 13;
  h1 = (h1 * 0xc2b2ae35) | 0;
  h1 ^= h1 >>> 16;

  return (h1 | 0).toString();
}

function detectMime(bytes: Uint8Array): string | undefined {
  if (bytes.length >= 4) {
    if (
      bytes[0] === 0x89 &&
      bytes[1] === 0x50 &&
      bytes[2] === 0x4e &&
      bytes[3] === 0x47
    ) {
      return 'image/png';
    }
    if (
      bytes[0] === 0x00 &&
      bytes[1] === 0x00 &&
      (bytes[2] === 0x01 || bytes[2] === 0x02) &&
      bytes[3] === 0x00
    ) {
      return 'image/x-icon';
    }
    if (bytes[0] === 0x47 && bytes[1] === 0x49 && bytes[2] === 0x46) {
      return 'image/gif';
    }
    if (
      bytes[0] === 0xff &&
      bytes[1] === 0xd8 &&
      bytes[bytes.length - 2] === 0xff &&
      bytes[bytes.length - 1] === 0xd9
    ) {
      return 'image/jpeg';
    }
  }
  return undefined;
}

const FaviconHash: React.FC = () => {
  const [input, setInput] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [hash, setHash] = useState('');
  const [size, setSize] = useState<number | null>(null);
  const [mime, setMime] = useState('');
  const [error, setError] = useState('');
  const [warning, setWarning] = useState('');
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const copy = useCallback((text: string) => {
    if (!text) return;
    navigator.clipboard?.writeText(text).catch(() => {});
  }, []);

  const process = useCallback(async () => {
    setError('');
    setHash('');
    setSize(null);
    setMime('');
    setWarning('');
    setLoading(true);
    let base64 = '';
    let bytes: Uint8Array;

    try {
      if (file) {
        const buf = await file.arrayBuffer();
        bytes = new Uint8Array(buf);
        base64 = btoa(String.fromCharCode(...bytes));
        setSize(bytes.length);
        const m = file.type || 'application/octet-stream';
        setMime(m);
        const detected = detectMime(bytes);
        if (detected && !m.toLowerCase().includes(detected)) {
          setWarning(`Content-Type is ${m} but data appears to be ${detected}`);
        }
      } else if (input.trim().startsWith('data:')) {
        const match = input.trim().match(/^data:([^;,]+)?(;base64)?,(.*)$/i);
        if (!match) {
          setError('Invalid data URI');
          setLoading(false);
          return;
        }
        const mimeType = match[1] || 'text/plain';
        const isBase64 = !!match[2];
        let dataPart = match[3];
        if (isBase64) {
          dataPart = dataPart.trim();
          const bin = atob(dataPart);
          bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0));
          base64 = dataPart;
        } else {
          const decoded = decodeURIComponent(dataPart);
          bytes = new TextEncoder().encode(decoded);
          base64 = btoa(decoded);
        }
        setSize(bytes.length);
        setMime(mimeType);
        const detected = detectMime(bytes);
        if (detected && !mimeType.toLowerCase().includes(detected)) {
          setWarning(
            `Content-Type is ${mimeType} but data appears to be ${detected}`
          );
        }
      } else if (input.trim()) {
        const res = await fetch(input.trim());
        if (res.type === 'opaque') {
          setError(
            'Opaque response (CORS). Please download and upload the favicon manually.'
          );
          setLoading(false);
          return;
        }
        if (!res.ok) {
          setError(`HTTP ${res.status}`);
          setLoading(false);
          return;
        }
        const buf = await res.arrayBuffer();
        bytes = new Uint8Array(buf);
        base64 = btoa(String.fromCharCode(...bytes));
        setSize(bytes.length);
        const m = res.headers.get('content-type') || 'application/octet-stream';
        setMime(m);
        const detected = detectMime(bytes);
        if (detected && !m.toLowerCase().includes(detected)) {
          setWarning(`Content-Type is ${m} but data appears to be ${detected}`);
        }
      } else {
        setError('Provide a URL, file, or data URI');
        setLoading(false);
        return;
      }
    } catch (e) {
      setError('Failed to process input');
      setLoading(false);
      return;
    }
    setLoading(false);
    setHash(murmurhash3_32_gc(base64));
  }, [input, file]);

  const onDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const f = e.dataTransfer.files?.[0];
    if (f) setFile(f);
  }, []);

  const onDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  }, []);

  return (
    <div className="h-full w-full bg-gray-900 text-white p-4 flex flex-col items-center space-y-4">
      <div className="flex flex-col space-y-2 w-full max-w-md">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="URL or data URI"
          className="p-2 rounded text-black"
        />
        <div
          onDrop={onDrop}
          onDragOver={onDragOver}
          onClick={() => fileInputRef.current?.click()}
          className="p-4 border-2 border-dashed border-gray-500 rounded text-center cursor-pointer"
        >
          {file ? file.name : 'Drag & drop favicon or click to select'}
          <input
            ref={fileInputRef}
            type="file"
            onChange={(e) => setFile(e.target.files?.[0] || null)}
            className="hidden"
          />
        </div>
        <button
          type="button"
          onClick={process}
          disabled={loading}
          className="px-4 py-2 bg-blue-600 rounded disabled:opacity-50"
        >
          {loading ? 'Processing…' : 'Hash'}
        </button>
      </div>
      {error && <div className="text-red-400">{error}</div>}
      {warning && <div className="text-yellow-400">{warning}</div>}
      {hash && size !== null && (
        <div className="w-full max-w-md space-y-2">
          <div className="flex items-center space-x-2">
            <span className="font-semibold">MMH3:</span>
            <span className="flex-1 break-all">{hash}</span>
            <button
              type="button"
              onClick={() => copy(hash)}
              className="px-2 py-1 bg-blue-600 rounded"
            >
              Copy
            </button>
          </div>
          <div className="flex items-center space-x-2">
            <span className="font-semibold">Query:</span>
            <span className="flex-1 break-all">http.favicon.hash:{hash}</span>
            <button
              type="button"
              onClick={() => copy(`http.favicon.hash:${hash}`)}
              className="px-2 py-1 bg-blue-600 rounded"
            >
              Copy
            </button>
          </div>
          <div>Size: {size} bytes</div>
          <div>Mime: {mime}</div>
          <div className="flex space-x-4 text-blue-400 underline">
            <a
              href={`https://www.shodan.io/search?query=http.favicon.hash:${hash}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              Shodan
            </a>
            <a
              href={`https://search.censys.io/search?resource=hosts&q=services.http.response.favicon.hash%3A${hash}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              Censys
            </a>
            <a
              href={`https://www.virustotal.com/gui/search/http.favicon.hash:${hash}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              VirusTotal
            </a>
          </div>
        </div>
      )}
    </div>
  );
};

export default FaviconHash;
