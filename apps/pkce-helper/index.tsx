import React, { useState, useEffect } from 'react';

const base64url = (buffer: ArrayBuffer | Buffer) =>
  Buffer.from(buffer)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');

const sha256 = async (verifier: string) => {
  const TE =
    typeof TextEncoder !== 'undefined' ? TextEncoder : require('util').TextEncoder;
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
  const [verifierError, setVerifierError] = useState('');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedVerifier = window.localStorage.getItem('pkce-verifier');
      const savedState = window.localStorage.getItem('pkce-state');
      if (savedVerifier) setVerifier(savedVerifier);
      if (savedState) setState(savedState);
    }
  }, []);

  const verifierRegex = /^[A-Za-z0-9-._~]{43,128}$/;

  useEffect(() => {
    if (!verifier) {
      setVerifierError('');
      setChallenge('');
      return;
    }
    if (verifierRegex.test(verifier)) {
      setVerifierError('');
      sha256(verifier).then(setChallenge);
      if (typeof window !== 'undefined') {
        window.localStorage.setItem('pkce-verifier', verifier);
      }
    } else {
      setVerifierError(
        'Verifier must be 43-128 characters using A-Z, a-z, 0-9, "-._~".'
      );
      setChallenge('');
    }
  }, [verifier]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('pkce-state', state);
    }
  }, [state]);

  const handleGenerate = () => {
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

  const copy = async (text: string) => {
    try {
      await navigator.clipboard?.writeText(text);
    } catch {
      // ignore
    }
  };

  const authUrl = `https://auth.example.com/authorize?response_type=code&client_id=CLIENT_ID&redirect_uri=REDIRECT_URI&code_challenge=${challenge}&code_challenge_method=S256&state=${state}`;
  const callbackExample = `https://client.example.com/callback?code=AUTH_CODE&state=${state}`;
  const tokenCurl = `curl -X POST https://auth.example.com/token -H 'Content-Type: application/x-www-form-urlencoded' -d "client_id=CLIENT_ID&grant_type=authorization_code&code=CODE_FROM_CALLBACK&redirect_uri=REDIRECT_URI&code_verifier=${verifier}"`;

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
          {verifierError && (
            <div data-testid="verifier-error" className="text-xs text-yellow-300">
              {verifierError}
            </div>
          )}
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
            placeholder="https://example.com/callback?code=AUTH_CODE&state=STATE"
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
          <div className="text-sm font-bold">Authorization Redirect</div>
          <div className="flex items-center space-x-2">
            <input
              data-testid="auth-url"
              readOnly
              value={authUrl}
              className="flex-1 p-2 rounded text-black"
            />
            <button
              onClick={() => copy(authUrl)}
              className="px-2 py-1 bg-blue-600 rounded"
              type="button"
              data-testid="copy-auth"
            >
              Copy
            </button>
          </div>
        </div>
        <div>
          <div className="text-sm font-bold">Callback Example</div>
          <div className="flex items-center space-x-2">
            <input
              data-testid="callback-example"
              readOnly
              value={callbackExample}
              className="flex-1 p-2 rounded text-black"
            />
            <button
              onClick={() => copy(callbackExample)}
              className="px-2 py-1 bg-blue-600 rounded"
              type="button"
              data-testid="copy-callback"
            >
              Copy
            </button>
          </div>
        </div>
        <div>
          <div className="text-sm font-bold">Token Exchange</div>
          <div className="flex items-center space-x-2">
            <input
              data-testid="token-curl"
              readOnly
              value={tokenCurl}
              className="flex-1 p-2 rounded text-black text-xs"
            />
            <button
              onClick={() => copy(tokenCurl)}
              className="px-2 py-1 bg-blue-600 rounded"
              type="button"
              data-testid="copy-token"
            >
              Copy
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PkceHelper;
export const displayPkceHelper = () => <PkceHelper />;
