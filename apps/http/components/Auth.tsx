'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';

type AuthStrategy = 'none' | 'bearer' | 'basic';

export const buildBearerHeader = (token: string): string => {
  const normalized = token.trim();
  if (!normalized) {
    throw new Error('A bearer token is required.');
  }

  return `Authorization: Bearer ${normalized}`;
};

const encodeBase64 = (value: string): string => {
  if (typeof globalThis !== 'undefined') {
    if (typeof globalThis.btoa === 'function') {
      try {
        return globalThis.btoa(value);
      } catch (error) {
        const encoder = new TextEncoder();
        const bytes = encoder.encode(value);
        let binary = '';
        bytes.forEach((byte) => {
          binary += String.fromCharCode(byte);
        });
        return globalThis.btoa(binary);
      }
    }

    if (typeof (globalThis as typeof globalThis & { Buffer?: typeof Buffer }).Buffer !== 'undefined') {
      return (globalThis as typeof globalThis & { Buffer: typeof Buffer }).Buffer.from(value, 'utf-8').toString('base64');
    }
  }

  throw new Error('Base64 encoding is not available in this environment.');
};

export const buildBasicHeader = (username: string, password: string): string => {
  const normalizedUsername = username.trim();
  if (!normalizedUsername) {
    throw new Error('A username is required.');
  }

  if (!password) {
    throw new Error('A password is required.');
  }

  const encoded = encodeBase64(`${normalizedUsername}:${password}`);
  return `Authorization: Basic ${encoded}`;
};

export interface AuthProps {
  onSanitizedHeaderChange: (header: string | null) => void;
}

const Auth: React.FC<AuthProps> = ({ onSanitizedHeaderChange }) => {
  const [strategy, setStrategy] = useState<AuthStrategy>('none');
  const [bearerToken, setBearerToken] = useState('');
  const [basicUsername, setBasicUsername] = useState('');
  const [basicPassword, setBasicPassword] = useState('');
  const [bearerTouched, setBearerTouched] = useState(false);
  const [basicUsernameTouched, setBasicUsernameTouched] = useState(false);
  const [basicPasswordTouched, setBasicPasswordTouched] = useState(false);

  const resetTouchedState = useCallback(() => {
    setBearerTouched(false);
    setBasicUsernameTouched(false);
    setBasicPasswordTouched(false);
  }, []);

  const actualHeader = useMemo(() => {
    try {
      if (strategy === 'bearer') {
        return buildBearerHeader(bearerToken);
      }

      if (strategy === 'basic') {
        return buildBasicHeader(basicUsername, basicPassword);
      }
    } catch (error) {
      return null;
    }

    return null;
  }, [strategy, bearerToken, basicUsername, basicPassword]);

  const sanitizedHeader = useMemo(() => {
    if (!actualHeader) {
      return null;
    }

    if (strategy === 'bearer') {
      return 'Authorization: Bearer <hidden>';
    }

    if (strategy === 'basic') {
      return 'Authorization: Basic <hidden>';
    }

    return null;
  }, [actualHeader, strategy]);

  useEffect(() => {
    onSanitizedHeaderChange(sanitizedHeader);
  }, [onSanitizedHeaderChange, sanitizedHeader]);

  useEffect(() => {
    resetTouchedState();
  }, [strategy, resetTouchedState]);

  const bearerError = strategy === 'bearer' && bearerTouched && !bearerToken.trim();
  const basicUsernameError = strategy === 'basic' && basicUsernameTouched && !basicUsername.trim();
  const basicPasswordError = strategy === 'basic' && basicPasswordTouched && !basicPassword;

  return (
    <section aria-labelledby="auth-section-title" className="space-y-3">
      <div>
        <h2 id="auth-section-title" className="text-lg font-semibold text-white">
          Authorization Header
        </h2>
        <p className="text-sm text-gray-400">
          Choose an auth scheme to generate a sanitized Authorization header for your curl command.
        </p>
      </div>

      <label className="block text-sm font-medium" htmlFor="auth-strategy">
        Scheme
      </label>
      <select
        id="auth-strategy"
        className="w-full rounded border border-gray-700 bg-gray-800 p-2 text-white"
        value={strategy}
        onChange={(event) => setStrategy(event.target.value as AuthStrategy)}
      >
        <option value="none">None</option>
        <option value="bearer">Bearer Token</option>
        <option value="basic">Basic (username &amp; password)</option>
      </select>

      {strategy === 'bearer' && (
        <div className="space-y-1">
          <label className="block text-sm font-medium" htmlFor="bearer-token">
            Bearer token
          </label>
          <input
            id="bearer-token"
            type="password"
            className="w-full rounded border border-gray-700 bg-gray-800 p-2 text-white"
            value={bearerToken}
            onChange={(event) => setBearerToken(event.target.value)}
            onBlur={() => setBearerTouched(true)}
            autoComplete="off"
            aria-invalid={bearerError}
          />
          {bearerError && (
            <p role="alert" className="text-xs text-red-400">
              Enter a bearer token to generate the header.
            </p>
          )}
        </div>
      )}

      {strategy === 'basic' && (
        <div className="space-y-3">
          <div className="space-y-1">
            <label className="block text-sm font-medium" htmlFor="basic-username">
              Username
            </label>
            <input
              id="basic-username"
              type="text"
              className="w-full rounded border border-gray-700 bg-gray-800 p-2 text-white"
              value={basicUsername}
              onChange={(event) => setBasicUsername(event.target.value)}
              onBlur={() => setBasicUsernameTouched(true)}
              autoComplete="off"
              aria-invalid={basicUsernameError}
            />
            {basicUsernameError && (
              <p role="alert" className="text-xs text-red-400">
                A username is required for basic auth.
              </p>
            )}
          </div>
          <div className="space-y-1">
            <label className="block text-sm font-medium" htmlFor="basic-password">
              Password
            </label>
            <input
              id="basic-password"
              type="password"
              className="w-full rounded border border-gray-700 bg-gray-800 p-2 text-white"
              value={basicPassword}
              onChange={(event) => setBasicPassword(event.target.value)}
              onBlur={() => setBasicPasswordTouched(true)}
              autoComplete="off"
              aria-invalid={basicPasswordError}
            />
            {basicPasswordError && (
              <p role="alert" className="text-xs text-red-400">
                A password is required for basic auth.
              </p>
            )}
          </div>
        </div>
      )}

      <div className="rounded border border-gray-800 bg-black p-3">
        <p className="text-xs uppercase tracking-wide text-gray-400">Header preview</p>
        {sanitizedHeader ? (
          <code className="mt-1 block font-mono text-sm text-green-400">{sanitizedHeader}</code>
        ) : (
          <p className="mt-1 text-sm text-gray-500">
            Provide credentials to generate a sanitized header. Secrets stay only in this form.
          </p>
        )}
      </div>
    </section>
  );
};

export default Auth;
