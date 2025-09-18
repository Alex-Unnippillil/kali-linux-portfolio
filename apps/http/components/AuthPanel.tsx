'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';

import { safeSessionStorage } from '@/utils/safeSessionStorage';

export type AuthType = 'none' | 'basic' | 'bearer';

export interface AuthState {
  type: AuthType;
  username?: string;
  password?: string;
  token?: string;
}

export interface AuthExportState {
  type: AuthType;
  username?: string;
  password?: string;
  token?: string;
  hasCredentials?: boolean;
}

export interface AuthChangePayload {
  state: AuthState;
  header: string | null;
  exportData: AuthExportState;
}

interface AuthPanelProps {
  onAuthChange?: (payload: AuthChangePayload) => void;
}

const STORAGE_KEY = 'http-auth-session';
const REDACTED = '***redacted***';

const createDefaultState = (): AuthState => ({
  type: 'none',
  username: '',
  password: '',
  token: '',
});

const loadInitialState = (): AuthState => {
  if (!safeSessionStorage) {
    return createDefaultState();
  }
  try {
    const raw = safeSessionStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return createDefaultState();
    }
    const parsed = JSON.parse(raw) as Partial<AuthState>;
    const type: AuthType = parsed.type === 'basic' || parsed.type === 'bearer' ? parsed.type : 'none';
    return {
      type,
      username: parsed.username ?? '',
      password: parsed.password ?? '',
      token: parsed.token ?? '',
    };
  } catch {
    return createDefaultState();
  }
};

const base64Encode = (value: string): string => {
  const globalScope = globalThis as typeof globalThis & {
    btoa?: (data: string) => string;
    Buffer?: {
      from?: (input: string, encoding?: string) => { toString: (encoding: string) => string };
    };
  };

  if (typeof globalScope.btoa === 'function') {
    return globalScope.btoa(value);
  }

  const bufferCtor = globalScope.Buffer;
  if (bufferCtor && typeof bufferCtor.from === 'function') {
    return bufferCtor.from(value, 'utf-8').toString('base64');
  }

  return value;
};

export const buildAuthHeader = (state: AuthState): string | null => {
  if (state.type === 'basic') {
    const username = state.username ?? '';
    const password = state.password ?? '';
    if (!username && !password) {
      return null;
    }
    const encoded = base64Encode(`${username}:${password}`);
    return `Basic ${encoded}`;
  }
  if (state.type === 'bearer') {
    const token = state.token?.trim();
    if (!token) {
      return null;
    }
    return `Bearer ${token}`;
  }
  return null;
};

export const redactAuthForExport = (state: AuthState): AuthExportState => {
  if (state.type === 'basic') {
    return {
      type: 'basic',
      username: state.username ?? '',
      password: state.password ? REDACTED : undefined,
      hasCredentials: Boolean((state.username ?? '').length || (state.password ?? '').length),
    };
  }
  if (state.type === 'bearer') {
    return {
      type: 'bearer',
      token: state.token ? REDACTED : undefined,
      hasCredentials: Boolean(state.token?.length),
    };
  }
  return { type: 'none', hasCredentials: false };
};

const AuthPanel: React.FC<AuthPanelProps> = ({ onAuthChange }) => {
  const [state, setState] = useState<AuthState>(() => loadInitialState());

  const notifyChange = useCallback(
    (nextState: AuthState) => {
      const header = buildAuthHeader(nextState);
      const exportData = redactAuthForExport(nextState);
      onAuthChange?.({ state: nextState, header, exportData });
    },
    [onAuthChange],
  );

  useEffect(() => {
    notifyChange(state);

    if (!safeSessionStorage) {
      return;
    }

    try {
      if (state.type === 'none') {
        safeSessionStorage.removeItem(STORAGE_KEY);
        return;
      }
      const payload: AuthState = { type: state.type };
      if (state.type === 'basic') {
        payload.username = state.username ?? '';
        payload.password = state.password ?? '';
      } else if (state.type === 'bearer') {
        payload.token = state.token ?? '';
      }
      safeSessionStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    } catch {
      // Ignore storage errors
    }
  }, [state, notifyChange]);

  const handleTypeChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const nextType = event.target.value as AuthType;
    setState((prev) => {
      if (nextType === 'none') {
        return createDefaultState();
      }
      return { ...prev, type: nextType };
    });
  };

  const handleUsernameChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value;
    setState((prev) => ({ ...prev, username: value }));
  };

  const handlePasswordChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value;
    setState((prev) => ({ ...prev, password: value }));
  };

  const handleTokenChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = event.target.value;
    setState((prev) => ({ ...prev, token: value }));
  };

  const handleReset = () => {
    setState(createDefaultState());
  };

  const hasStoredSecret = useMemo(() => Boolean(buildAuthHeader(state)), [state]);

  return (
    <section className="space-y-4 rounded border border-gray-700 bg-gray-900 p-4" aria-label="Authentication panel">
      <header className="flex items-center justify-between gap-2">
        <div>
          <h2 className="text-lg font-semibold text-white">Authentication</h2>
          <p className="text-xs text-gray-300">
            Secrets are kept in sessionStorage. Reset the session when you are done on shared devices.
          </p>
        </div>
        <button
          type="button"
          onClick={handleReset}
          className="rounded border border-gray-600 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-gray-200 hover:bg-gray-800"
        >
          Reset session
        </button>
      </header>

      <div className="space-y-2">
        <label htmlFor="auth-type" className="block text-sm font-medium text-gray-200">
          Authorization type
        </label>
        <select
          id="auth-type"
          value={state.type}
          onChange={handleTypeChange}
          className="w-full rounded border border-gray-700 bg-gray-800 p-2 text-sm text-white"
        >
          <option value="none">No auth</option>
          <option value="basic">Basic (username &amp; password)</option>
          <option value="bearer">Bearer token</option>
        </select>
      </div>

      {state.type === 'basic' && (
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <label htmlFor="auth-username" className="block text-sm font-medium text-gray-200">
              Username
            </label>
            <input
              id="auth-username"
              type="text"
              aria-label="Basic auth username"
              value={state.username ?? ''}
              onChange={handleUsernameChange}
              className="w-full rounded border border-gray-700 bg-gray-800 p-2 text-sm text-white"
            />
          </div>
          <div className="space-y-2">
            <label htmlFor="auth-password" className="block text-sm font-medium text-gray-200">
              Password
            </label>
            <input
              id="auth-password"
              type="password"
              aria-label="Basic auth password"
              value={state.password ?? ''}
              onChange={handlePasswordChange}
              className="w-full rounded border border-gray-700 bg-gray-800 p-2 text-sm text-white"
            />
          </div>
        </div>
      )}

      {state.type === 'bearer' && (
        <div className="space-y-2">
          <label htmlFor="auth-token" className="block text-sm font-medium text-gray-200">
            Bearer token
          </label>
          <textarea
            id="auth-token"
            aria-label="Bearer token value"
            value={state.token ?? ''}
            onChange={handleTokenChange}
            className="h-24 w-full rounded border border-gray-700 bg-gray-800 p-2 text-sm text-white"
          />
        </div>
      )}

      {hasStoredSecret && (
        <p className="text-xs text-green-400">Authorization headers will be added to generated curl commands.</p>
      )}
    </section>
  );
};

export default AuthPanel;
export { STORAGE_KEY as AUTH_SESSION_STORAGE_KEY };
