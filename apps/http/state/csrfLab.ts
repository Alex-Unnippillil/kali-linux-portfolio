"use client";

import { useCallback } from 'react';
import usePersistentState from '../../../hooks/usePersistentState';

export type SameSiteMode = 'Strict' | 'Lax' | 'None';

export interface CsrfCookie {
  name: string;
  value: string;
  domain: string;
  path: string;
  sameSite: SameSiteMode;
  secure: boolean;
}

export interface CsrfLabState {
  cookie: CsrfCookie;
  explanations: Record<SameSiteMode, string>;
}

const STORAGE_KEY = 'http:csrf-lab:v1';

export const BASELINE_STATE: CsrfLabState = {
  cookie: {
    name: 'session',
    value: 'demo123',
    domain: 'bank.local',
    path: '/',
    sameSite: 'Lax',
    secure: false,
  },
  explanations: {
    Strict:
      'SameSite=Strict keeps the cookie scoped to the site that issued it. Background or cross-site form posts will not carry the cookie.',
    Lax:
      'SameSite=Lax allows the cookie on top-level navigations like clicking a link, but blocks it on background POSTs used by CSRF attacks.',
    None:
      'SameSite=None sends the cookie with every request. Browsers require the Secure flag so it is only sent over HTTPS.',
  },
};

const isSameSite = (value: unknown): value is SameSiteMode =>
  value === 'Strict' || value === 'Lax' || value === 'None';

const isCookie = (value: unknown): value is CsrfCookie => {
  if (!value || typeof value !== 'object') return false;
  const cookie = value as Partial<CsrfCookie>;
  return (
    typeof cookie.name === 'string' &&
    typeof cookie.value === 'string' &&
    typeof cookie.domain === 'string' &&
    typeof cookie.path === 'string' &&
    isSameSite(cookie.sameSite) &&
    typeof cookie.secure === 'boolean'
  );
};

const isState = (value: unknown): value is CsrfLabState => {
  if (!value || typeof value !== 'object') return false;
  const state = value as Partial<CsrfLabState>;
  const explanations = state.explanations as
    | Partial<Record<SameSiteMode, unknown>>
    | undefined;
  return (
    isCookie(state.cookie) &&
    !!explanations &&
    typeof explanations === 'object' &&
    typeof explanations.Strict === 'string' &&
    typeof explanations.Lax === 'string' &&
    typeof explanations.None === 'string'
  );
};

export function useCsrfLabState() {
  const [state, setState, resetState] = usePersistentState<CsrfLabState>(
    STORAGE_KEY,
    BASELINE_STATE,
    (value): value is CsrfLabState => isState(value),
  );

  const updateCookie = useCallback(
    (patch: Partial<CsrfCookie>) => {
      setState((prev) => ({
        ...prev,
        cookie: {
          ...prev.cookie,
          ...patch,
        },
      }));
    },
    [setState],
  );

  const setSameSite = useCallback(
    (mode: SameSiteMode) => {
      if (!isSameSite(mode)) return;
      updateCookie({ sameSite: mode });
    },
    [updateCookie],
  );

  const setSecure = useCallback(
    (secure: boolean) => {
      updateCookie({ secure });
    },
    [updateCookie],
  );

  const reset = useCallback(() => {
    resetState();
  }, [resetState]);

  return {
    state,
    cookie: state.cookie,
    explanations: state.explanations,
    setCookie: updateCookie,
    setSameSite,
    setSecure,
    reset,
  } as const;
}
