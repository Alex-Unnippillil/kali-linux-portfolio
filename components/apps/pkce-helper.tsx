import React, { useState, useEffect } from 'react';

const PKCEHelper: React.FC = () => {
  const [length, setLength] = useState(64);
  const [method, setMethod] = useState<'S256' | 'plain'>('S256');
  const [codeVerifier, setCodeVerifier] = useState('');
  const [codeChallenge, setCodeChallenge] = useState('');
  const [counter, setCounter] = useState(60);

  const generate = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~';
    const array = new Uint8Array(length);
    if (window.crypto && window.crypto.getRandomValues) {
      window.crypto.getRandomValues(array);
    } else {
      throw new Error(
        'Secure random number generation is not available. PKCE code verifier cannot be generated.'
      );
    }
    let verifier = '';
    for (let i = 0; i < length; i += 1) {
      verifier += chars[array[i] % chars.length];
    }
    setCodeVerifier(verifier);

    if (method === 'S256') {
      const encoder = new TextEncoder();
      window.crypto.subtle
        .digest('SHA-256', encoder.encode(verifier))
        .then((hash) => {
          const bytes = Array.from(new Uint8Array(hash));
          const base64 = btoa(String.fromCharCode(...bytes))
            .replace(/\+/g, '-')
            .replace(/\//g, '_')
            .replace(/=+$/, '');
          setCodeChallenge(base64);
        });
    } else {
      setCodeChallenge(verifier);
    }
    setCounter(60);
  };

  useEffect(() => {
    generate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [length, method]);

  useEffect(() => {
    if (counter <= 0) {
      generate();
      return;
    }
    const t = setTimeout(() => setCounter((c) => c - 1), 1000);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [counter]);

  const copy = async (text: string) => {
    try {
      await navigator.clipboard?.writeText(text);
    } catch {
      // ignore
    }
  };

  return (
    <div className="h-full w-full bg-gray-900 text-white p-4 space-y-4">
      <div className="flex flex-col sm:flex-row gap-2">
        <label className="flex items-center gap-2">
          Length:
          <input
            type="number"
            min={43}
            max={128}
            value={length}
            onChange={(e) => setLength(parseInt(e.target.value, 10) || 43)}
            className="text-black px-2 py-1 w-24"
          />
        </label>
        <label className="flex items-center gap-2">
          Method:
          <select
            value={method}
            onChange={(e) => setMethod(e.target.value as 'S256' | 'plain')}
            className="text-black px-2 py-1"
          >
            <option value="S256">S256</option>
            <option value="plain">plain</option>
          </select>
        </label>
        <button
          type="button"
          onClick={generate}
          className="px-4 py-1 bg-green-600 rounded"
        >
          Refresh
        </button>
        <span className="self-center text-sm">Refresh in {counter}s</span>
      </div>
      <div className="flex items-center space-x-2">
        <input
          type="text"
          readOnly
          value={codeVerifier}
          className="flex-1 text-black px-2 py-1"
        />
        <button
          type="button"
          onClick={() => copy(codeVerifier)}
          className="px-3 py-1 bg-blue-600 rounded"
        >
          Copy
        </button>
      </div>
      <div className="flex items-center space-x-2">
        <input
          type="text"
          readOnly
          value={codeChallenge}
          className="flex-1 text-black px-2 py-1"
        />
        <button
          type="button"
          onClick={() => copy(codeChallenge)}
          className="px-3 py-1 bg-blue-600 rounded"
        >
          Copy
        </button>
      </div>
    </div>
  );
};

export default PKCEHelper;

