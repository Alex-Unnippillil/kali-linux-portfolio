import React, { useState, useEffect } from 'react';

const base64url = (buffer: ArrayBuffer | Buffer) =>
  Buffer.from(buffer)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');

const sha256 = async (verifier: string) => {
  const TE = typeof TextEncoder !== 'undefined' ? TextEncoder : require('util').TextEncoder;
  const data = new TE().encode(verifier);
  if (typeof window !== 'undefined' && window.crypto?.subtle) {
    const digest = await window.crypto.subtle.digest('SHA-256', data);
    return base64url(digest);
  }
  const crypto = require('crypto');
  return base64url(crypto.createHash('sha256').update(data).digest());
};

const randomString = (len: number) => {
  const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~';
  let result = '';
  if (typeof window !== 'undefined' && window.crypto?.getRandomValues) {
    const array = new Uint8Array(len);
    window.crypto.getRandomValues(array);
    for (let i = 0; i < len; i++) result += charset[array[i] % charset.length];
  } else {
    const crypto = require('crypto');
    const buf = crypto.randomBytes(len);
    for (let i = 0; i < len; i++) result += charset[buf[i] % charset.length];
  }
  return result;
};

const PkceHelper: React.FC = () => {
  const [verifier, setVerifier] = useState('');
  const [challenge, setChallenge] = useState('');
  const [state, setState] = useState('');
  const [callback, setCallback] = useState('');
  const [result, setResult] = useState('');

  useEffect(() => {
    if (verifier) {
      sha256(verifier).then(setChallenge);
    } else {
      setChallenge('');
    }
  }, [verifier]);

  const handleGenerate = async () => {
    const v = randomString(64);
    setVerifier(v);
    const s = randomString(16);
    setState(s);
  };

  const verifyCallback = () => {
    try {
      const url = new URL(callback);
      const cbState = url.searchParams.get('state');
      setResult(cbState === state ? 'State valid' : 'State mismatch');
    } catch {
      setResult('Invalid URL');
    }
  };

  return (
    <div className="h-full w-full p-4 overflow-y-auto bg-gray-900 text-white space-y-4">
      <button
        onClick={handleGenerate}
        className="px-2 py-1 bg-blue-600 rounded"
        data-testid="generate"
      >
        Generate
      </button>
      <div className="space-y-2">
        <div>
          <label className="block text-sm">Code Verifier</label>
          <input
            data-testid="verifier"
            value={verifier}
            onChange={(e) => setVerifier(e.target.value)}
            className="w-full p-2 rounded text-black"
          />
        </div>
        <div>
          <label className="block text-sm">Code Challenge (S256)</label>
          <input
            data-testid="challenge"
            readOnly
            value={challenge}
            className="w-full p-2 rounded text-black"
          />
        </div>
        <div>
          <label className="block text-sm">State</label>
          <input
            data-testid="state"
            value={state}
            onChange={(e) => setState(e.target.value)}
            className="w-full p-2 rounded text-black"
          />
        </div>
      </div>
      <div className="space-y-2">
        <div>
          <label className="block text-sm">Callback URL</label>
          <input
            data-testid="callback-input"
            value={callback}
            onChange={(e) => setCallback(e.target.value)}
            className="w-full p-2 rounded text-black"
            placeholder="https://example.com/callback?code=...&state=..."
          />
        </div>
        <button
          onClick={verifyCallback}
          data-testid="verify-btn"
          className="px-2 py-1 bg-green-600 rounded"
        >
          Verify
        </button>
        {result && (
          <div data-testid="verify-result" className="text-sm">
            {result}
          </div>
        )}
      </div>
      <div className="space-y-2">
        <div>
          <div className="text-sm font-bold">Auth Request</div>
          <pre
            data-testid="auth-curl"
            className="p-2 bg-gray-800 rounded text-xs overflow-auto"
          >{`curl "https://auth.example.com/authorize?response_type=code&client_id=CLIENT_ID&redirect_uri=REDIRECT_URI&code_challenge=${challenge}&code_challenge_method=S256&state=${state}"`}</pre>
        </div>
        <div>
          <div className="text-sm font-bold">Token Exchange</div>
          <pre
            data-testid="token-curl"
            className="p-2 bg-gray-800 rounded text-xs overflow-auto"
          >{`curl -X POST https://auth.example.com/token -H 'Content-Type: application/x-www-form-urlencoded' -d "client_id=CLIENT_ID&grant_type=authorization_code&code=CODE_FROM_CALLBACK&redirect_uri=REDIRECT_URI&code_verifier=${verifier}"`}</pre>
        </div>
      </div>
    </div>
  );
};

export default PkceHelper;
export const displayPkceHelper = () => <PkceHelper />;

