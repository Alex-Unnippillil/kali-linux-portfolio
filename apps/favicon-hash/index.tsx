import React, { useState, useCallback } from 'react';

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

const FaviconHash: React.FC = () => {
  const [input, setInput] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [hash, setHash] = useState('');
  const [size, setSize] = useState<number | null>(null);
  const [mime, setMime] = useState('');
  const [error, setError] = useState('');

  const copy = useCallback((text: string) => {
    if (!text) return;
    navigator.clipboard?.writeText(text).catch(() => {});
  }, []);

  const process = useCallback(async () => {
    setError('');
    setHash('');
    setSize(null);
    setMime('');
    let base64 = '';
    let bytes: Uint8Array;

    try {
      if (file) {
        const buf = await file.arrayBuffer();
        bytes = new Uint8Array(buf);
        base64 = btoa(String.fromCharCode(...bytes));
        setSize(bytes.length);
        setMime(file.type || 'application/octet-stream');
      } else if (input.trim().startsWith('data:')) {
        const match = input.trim().match(/^data:([^;,]+)?(;base64)?,(.*)$/i);
        if (!match) {
          setError('Invalid data URI');
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
      } else if (input.trim()) {
        const res = await fetch(`/api/favicon?url=${encodeURIComponent(input.trim())}`);
        const data = await res.json();
        if (!data.ok) {
          setError(data.message || 'Failed to fetch URL');
          return;
        }
        base64 = data.base64;
        setSize(data.size);
        setMime(data.mime);
      } else {
        setError('Provide a URL, file, or data URI');
        return;
      }
    } catch (e) {
      setError('Failed to process input');
      return;
    }

    setHash(murmurhash3_32_gc(base64));
  }, [input, file]);

  return (
    <div className="h-full w-full bg-gray-900 text-white p-4 flex flex-col items-center space-y-4">
      <div className="flex flex-col space-y-2 w-full max-w-md">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="URL or data URI"
          className="p-2 rounded text-black"
        />
        <input
          type="file"
          onChange={(e) => setFile(e.target.files?.[0] || null)}
          className="p-2 rounded text-black"
        />
        <button
          type="button"
          onClick={process}
          className="px-4 py-2 bg-blue-600 rounded"
        >
          Hash
        </button>
      </div>
      {error && <div className="text-red-400">{error}</div>}
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
