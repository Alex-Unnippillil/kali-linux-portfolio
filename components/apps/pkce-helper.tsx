import React, { useState, useEffect } from 'react';

const PKCEHelper: React.FC = () => {
  const [length, setLength] = useState(64);
  const [codeVerifier, setCodeVerifier] = useState('');
  const [challengeS256, setChallengeS256] = useState('');
  const [challengePlain, setChallengePlain] = useState('');
  const [authUrlS256, setAuthUrlS256] = useState('');
  const [authUrlPlain, setAuthUrlPlain] = useState('');
  const [lengthWarning, setLengthWarning] = useState('');
  const [counter, setCounter] = useState(60);
  const [flowStep, setFlowStep] = useState(0);

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

    // plain challenge
    setChallengePlain(verifier);

    // S256 challenge
    const encoder = new TextEncoder();
    const hash = await crypto.subtle.digest('SHA-256', encoder.encode(verifier));
    const bytes = Array.from(new Uint8Array(hash));
    const base64 = btoa(String.fromCharCode(...bytes))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');
    setChallengeS256(base64);

    setCounter(60);
    setFlowStep(0);
  };

  useEffect(() => {
    generate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [length]);

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
    const baseParams = {
      response_type: 'code',
      client_id: 'CLIENT_ID',
      redirect_uri: 'https://client.example.com/callback',
      scope: 'SCOPE',
      state: 'STATE',
    } as const;

    const paramsS256 = new URLSearchParams({
      ...baseParams,
      code_challenge: challengeS256,
      code_challenge_method: 'S256',
    });
    setAuthUrlS256(`https://auth.example.com/authorize?${paramsS256.toString()}`);

    const paramsPlain = new URLSearchParams({
      ...baseParams,
      code_challenge: challengePlain,
      code_challenge_method: 'plain',
    });
    setAuthUrlPlain(`https://auth.example.com/authorize?${paramsPlain.toString()}`);
  }, [challengeS256, challengePlain]);

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

  const steps = [
    { title: 'Authorization Request', content: authUrlS256 },
    {
      title: 'Authorization Response',
      content: 'https://client.example.com/callback?code=AUTH_CODE&state=STATE',
    },
    { title: 'Token Request', content: tokenRequest },
    { title: 'Token Response', content: '{"access_token":"FAKE_ACCESS_TOKEN"}' },
  ];

  const resetFlow = () => setFlowStep(0);
  const nextFlow = () => setFlowStep((s) => Math.min(s + 1, steps.length));

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
      <div>
        <div className="mb-1 text-sm">S256 Challenge</div>
        <div className="flex items-center space-x-2 mb-2">
          <input
            type="text"
            readOnly
            value={challengeS256}
            className="flex-1 text-black px-2 py-1"
          />
          <button
            type="button"
            onClick={() => copy(challengeS256)}
            className="px-3 py-1 bg-blue-600 rounded"
          >
            Copy
          </button>
        </div>
        <div className="mb-1 text-sm">plain Challenge</div>
        <div className="flex items-center space-x-2">
          <input
            type="text"
            readOnly
            value={challengePlain}
            className="flex-1 text-black px-2 py-1"
          />
          <button
            type="button"
            onClick={() => copy(challengePlain)}
            className="px-3 py-1 bg-blue-600 rounded"
          >
            Copy
          </button>
        </div>
      </div>
      <div>
        <div className="mb-1 text-sm">Authorization URL (S256)</div>
        <div className="flex items-center space-x-2 mb-2">
          <input
            type="text"
            readOnly
            value={authUrlS256}
            className="flex-1 text-black px-2 py-1"
          />
          <button
            type="button"
            onClick={() => copy(authUrlS256)}
            className="px-3 py-1 bg-blue-600 rounded"
          >
            Copy
          </button>
        </div>
        <div className="mb-1 text-sm">Authorization URL (plain)</div>
        <div className="flex items-center space-x-2">
          <input
            type="text"
            readOnly
            value={authUrlPlain}
            className="flex-1 text-black px-2 py-1"
          />
          <button
            type="button"
            onClick={() => copy(authUrlPlain)}
            className="px-3 py-1 bg-blue-600 rounded"
          >
            Copy
          </button>
        </div>
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
      <div className="space-y-2">
        <div className="flex space-x-2">
          <button
            type="button"
            onClick={resetFlow}
            className="px-3 py-1 bg-purple-600 rounded"
          >
            Reset
          </button>
          <button
            type="button"
            onClick={nextFlow}
            className="px-3 py-1 bg-purple-600 rounded"
            disabled={flowStep >= steps.length}
          >
            Next
          </button>
        </div>
        <ol className="space-y-2">
          {steps.slice(0, flowStep).map((s, idx) => (
            <li key={s.title} className="bg-gray-800 p-2">
              <div className="font-bold">
                {idx + 1}. {s.title}
              </div>
              <pre className="mt-1 overflow-auto text-xs">{s.content}</pre>
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
};

export default PKCEHelper;
