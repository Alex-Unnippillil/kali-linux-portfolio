import React, { useState, useEffect } from 'react';

const PKCEHelper: React.FC = () => {
  const [length, setLength] = useState(64);
  const [method, setMethod] = useState<'S256' | 'plain'>('S256');
  const [codeVerifier, setCodeVerifier] = useState('');
  const [codeChallenge, setCodeChallenge] = useState('');
  const [authUrl, setAuthUrl] = useState('');
  const [lengthWarning, setLengthWarning] = useState('');
  const [counter, setCounter] = useState(60);

  const generate = async () => {
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
      const hash = await crypto.subtle.digest('SHA-256', encoder.encode(verifier));
      const bytes = Array.from(new Uint8Array(hash));
      const base64 = btoa(String.fromCharCode(...bytes))
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');
      setCodeChallenge(base64);
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

  useEffect(() => {
    const params = new URLSearchParams({
      response_type: 'code',
      client_id: 'CLIENT_ID',
      redirect_uri: 'https://client.example.com/callback',
      scope: 'SCOPE',
      state: 'STATE',
      code_challenge: codeChallenge,
      code_challenge_method: method,
    });
    setAuthUrl(`https://auth.example.com/authorize?${params.toString()}`);
  }, [codeChallenge, method]);

  const copy = async (text: string) => {
    try {
      await navigator.clipboard?.writeText(text);
    } catch {
      // ignore
    }
  };

  const handleLengthChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value, 10);
    if (Number.isNaN(value)) {
      setLength(43);
      setLengthWarning('');
      return;
    }
    const clamped = Math.min(Math.max(value, 43), 128);
    setLength(clamped);
    setLengthWarning(
      value !== clamped ? 'Verifier length must be between 43 and 128 characters.' : ''
    );
  };

  const tokenRequest = `curl -X POST https://auth.example.com/token \\
  -d "grant_type=authorization_code" \\
  -d "code=AUTH_CODE" \\
  -d "redirect_uri=https://client.example.com/callback" \\
  -d "code_verifier=${codeVerifier}"`;

  const callbackSnippet = `const params = new URLSearchParams(window.location.search);\nconst code = params.get('code');\nconst state = params.get('state');`;

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
            onChange={handleLengthChange}
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
      {lengthWarning && <div className="text-yellow-300 text-sm">{lengthWarning}</div>}
      {method === 'plain' && (
        <div className="text-yellow-300 text-sm">
          Warning: plain method is less secure. Prefer S256.
        </div>
      )}
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
      <div className="flex items-center space-x-2">
        <input
          type="text"
          readOnly
          value={authUrl}
          className="flex-1 text-black px-2 py-1"
        />
        <button
          type="button"
          onClick={() => copy(authUrl)}
          className="px-3 py-1 bg-blue-600 rounded"
        >
          Copy
        </button>
      </div>
      <div className="space-y-2 text-sm">
        <div>
          Token request:
          <pre className="bg-gray-800 p-2 mt-1 overflow-auto text-xs">{tokenRequest}</pre>
        </div>
        <div>
          Callback handling:
          <pre className="bg-gray-800 p-2 mt-1 overflow-auto text-xs">{callbackSnippet}</pre>
        </div>
      </div>
    </div>
  );
};

export default PKCEHelper;
