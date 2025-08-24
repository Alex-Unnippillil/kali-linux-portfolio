import React, { useState } from 'react';
import { toUnicode } from 'punycode';

export const encodeUrl = (str: string): string => encodeURIComponent(str);

export const decodeUrl = (str: string): string => {
  try {
    return decodeURIComponent(str);
  } catch {
    return '';
  }
};

export const splitQuery = (url: string): Record<string, string> => {
  try {
    const u = new URL(url);
    const result: Record<string, string> = {};
    u.searchParams.forEach((value, key) => {
      result[key] = value;
    });
    return result;
  } catch {
    return {};
  }
};

export const signUrl = async (url: string, secret: string): Promise<string> => {
  const parsed = new URL(url);
  const params = Array.from(parsed.searchParams.entries()).sort();
  const canonical = params.map(([k, v]) => `${k}=${v}`).join('&');
  const data = `${parsed.pathname}?${canonical}`;
  let sig = '';
  if (typeof crypto !== 'undefined' && crypto.subtle) {
    const enc = new TextEncoder().encode(data);
    const key = await crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );
    const sigBuf = await crypto.subtle.sign('HMAC', key, enc);
    sig = Array.from(new Uint8Array(sigBuf))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
  } else {
    // Node fallback for tests
    const { createHmac } = await import('crypto');
    sig = createHmac('sha256', secret).update(data).digest('hex');
  }
  parsed.searchParams.set('signature', sig);
  return parsed.toString();
};

export const normalizeUrl = (url: string): string => {
  try {
    const u = new URL(url);
    // hostname is automatically converted to punycode
    u.protocol = u.protocol.toLowerCase();
    u.hostname = u.hostname.toLowerCase();
    return u.toString();
  } catch {
    return '';
  }
};

export const parseUrl = (url: string) => {
  try {
    const u = new URL(url);
    return {
      protocol: u.protocol,
      hostname: u.hostname,
      hostUnicode: toUnicode(u.hostname),
      pathname: u.pathname,
      search: u.search,
      hash: u.hash,
    };
  } catch {
    return null;
  }
};

const UrlTools: React.FC = () => {
  const [text, setText] = useState('');
  const [encoded, setEncoded] = useState('');

  const [splitInput, setSplitInput] = useState('');
  const [splitResult, setSplitResult] = useState<Record<string, string>>({});

  const [signInput, setSignInput] = useState('');
  const [secret, setSecret] = useState('');
  const [signed, setSigned] = useState('');

  const [parseInput, setParseInput] = useState('');
  const [parsed, setParsed] = useState<ReturnType<typeof parseUrl> | null>(null);
  const [normalized, setNormalized] = useState('');

  const copy = async (val: string) => {
    if (!val) return;
    try {
      await navigator.clipboard.writeText(val);
    } catch {
      // ignore
    }
  };

  const share = async (val: string) => {
    if (!val) return;
    if (navigator.share) {
      try {
        await navigator.share({ text: val });
        return;
      } catch {
        // ignore
      }
    }
    await copy(val);
  };

  const handleEncode = () => setEncoded(encodeUrl(text));
  const handleDecode = () => setEncoded(decodeUrl(text));
  const handleSplit = () => setSplitResult(splitQuery(splitInput));
  const handleSign = async () => {
    const result = await signUrl(signInput, secret);
    setSigned(result);
  };
  const handleParse = () => setParsed(parseUrl(parseInput));
  const handleNormalize = () => setNormalized(normalizeUrl(parseInput));

  return (
    <div className="h-full w-full bg-gray-900 text-white p-4 space-y-6 overflow-y-auto">
      <section>
        <h2 className="text-xl font-bold mb-2">URL Encode / Decode</h2>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          className="w-full text-black p-2 mb-2"
          rows={3}
        />
        <div className="space-x-2 mb-2">
          <button
            type="button"
            onClick={handleEncode}
            className="px-3 py-1 bg-blue-600 rounded"
          >
            Encode
          </button>
          <button
            type="button"
            onClick={handleDecode}
            className="px-3 py-1 bg-green-600 rounded"
          >
            Decode
          </button>
        </div>
        <div className="flex items-center space-x-2">
          <input
            type="text"
            readOnly
            value={encoded}
            className="flex-1 text-black px-2 py-1"
          />
          <button
            type="button"
            onClick={() => copy(encoded)}
            className="px-2 py-1 bg-blue-600 rounded"
          >
            Copy
          </button>
          <button
            type="button"
            onClick={() => share(encoded)}
            className="px-2 py-1 bg-purple-600 rounded"
          >
            Share
          </button>
        </div>
      </section>

      <section>
        <h2 className="text-xl font-bold mb-2">Query Parameter Splitter</h2>
        <input
          value={splitInput}
          onChange={(e) => setSplitInput(e.target.value)}
          className="w-full text-black p-2 mb-2"
          placeholder="https://example.com?foo=bar&baz=1"
        />
        <button
          type="button"
          onClick={handleSplit}
          className="px-3 py-1 bg-blue-600 rounded mb-2"
        >
          Split
        </button>
        <ul className="mb-2 space-y-1">
          {Object.keys(splitResult).length === 0 && <li>No parameters</li>}
          {Object.entries(splitResult).map(([k, v]) => (
            <li key={k}>
              {k}: {v}
            </li>
          ))}
        </ul>
        <div className="space-x-2">
          <button
            type="button"
            onClick={() => copy(JSON.stringify(splitResult))}
            className="px-2 py-1 bg-blue-600 rounded"
          >
            Copy
          </button>
          <button
            type="button"
            onClick={() => share(JSON.stringify(splitResult))}
            className="px-2 py-1 bg-purple-600 rounded"
          >
            Share
          </button>
        </div>
      </section>

      <section>
        <h2 className="text-xl font-bold mb-2">Presigned URL Signer</h2>
        <input
          value={signInput}
          onChange={(e) => setSignInput(e.target.value)}
          className="w-full text-black p-2 mb-2"
          placeholder="https://example.com/path?foo=bar"
        />
        <input
          value={secret}
          onChange={(e) => setSecret(e.target.value)}
          className="w-full text-black p-2 mb-2"
          placeholder="secret"
        />
        <button
          type="button"
          onClick={handleSign}
          className="px-3 py-1 bg-blue-600 rounded mb-2"
        >
          Sign
        </button>
        <div className="flex items-center space-x-2">
          <input
            type="text"
            readOnly
            value={signed}
            className="flex-1 text-black px-2 py-1"
          />
          <button
            type="button"
            onClick={() => copy(signed)}
            className="px-2 py-1 bg-blue-600 rounded"
          >
            Copy
          </button>
          <button
            type="button"
            onClick={() => share(signed)}
            className="px-2 py-1 bg-purple-600 rounded"
          >
            Share
          </button>
        </div>
      </section>

      <section>
        <h2 className="text-xl font-bold mb-2">Parse & Normalize</h2>
        <input
          value={parseInput}
          onChange={(e) => setParseInput(e.target.value)}
          className="w-full text-black p-2 mb-2"
          placeholder="https://mañana.com/../a"
        />
        <div className="space-x-2 mb-2">
          <button
            type="button"
            onClick={handleParse}
            className="px-3 py-1 bg-blue-600 rounded"
          >
            Parse
          </button>
          <button
            type="button"
            onClick={handleNormalize}
            className="px-3 py-1 bg-green-600 rounded"
          >
            Normalize
          </button>
        </div>
        {parsed && (
          <ul className="mb-2 space-y-1">
            <li>Protocol: {parsed.protocol}</li>
            <li>Hostname: {parsed.hostname}</li>
            <li>Unicode: {parsed.hostUnicode}</li>
            <li>Path: {parsed.pathname}</li>
            <li>Search: {parsed.search}</li>
            <li>Hash: {parsed.hash}</li>
          </ul>
        )}
        {normalized && (
          <div className="mt-2">Normalized: {normalized}</div>
        )}
      </section>
    </div>
  );
};

export default UrlTools;

