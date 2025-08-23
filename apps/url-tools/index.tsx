import React, { useState } from 'react';

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
  const enc = new TextEncoder().encode(data);
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const sigBuf = await crypto.subtle.sign('HMAC', key, enc);
  const sig = Array.from(new Uint8Array(sigBuf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
  parsed.searchParams.set('signature', sig);
  return parsed.toString();
};

const UrlTools: React.FC = () => {
  const [text, setText] = useState('');
  const [encoded, setEncoded] = useState('');

  const [splitInput, setSplitInput] = useState('');
  const [splitResult, setSplitResult] = useState<Record<string, string>>({});

  const [signInput, setSignInput] = useState('');
  const [secret, setSecret] = useState('');
  const [signed, setSigned] = useState('');

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
    </div>
  );
};

export default UrlTools;

