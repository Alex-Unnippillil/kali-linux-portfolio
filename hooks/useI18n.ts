"use client";

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AVAILABLE_LOCALES,
  FALLBACK_LOCALE,
  detectLocale,
  matchLocale,
} from '../utils/i18nConfig';
import { publish, subscribe } from '../utils/pubsub';
import { getLocale as loadLocale, setLocale as persistLocale } from '../utils/settingsStore';
import { MESSAGES, MessageDictionary } from '../data/i18n/messages';

const LOCALE_TOPIC = 'i18n:locale-change';

export interface TranslateOptions {
  fallback?: string;
  values?: Record<string, string | number>;
}

interface I18nState {
  locale: string;
  detectedLocale: string;
  messages: MessageDictionary;
}

const resolveMessages = (locale: string): MessageDictionary =>
  MESSAGES[locale] ?? MESSAGES[FALLBACK_LOCALE] ?? {};

let state: I18nState = {
  locale: FALLBACK_LOCALE,
  detectedLocale: detectLocale(),
  messages: resolveMessages(FALLBACK_LOCALE),
};

let hydrated = false;

function emit() {
  publish(LOCALE_TOPIC, { ...state });
}

async function hydrateFromStorage() {
  if (hydrated) return;
  hydrated = true;
  try {
    const stored = await loadLocale();
    const matched = matchLocale(stored);
    state = {
      ...state,
      locale: matched,
      messages: resolveMessages(matched),
    };
  } catch {
    // ignore storage errors
  }
  emit();
}

export function setI18nLocale(
  locale: string,
  options: { persist?: boolean } = {},
) {
  const matched = matchLocale(locale);
  if (matched === state.locale && options.persist !== false) {
    // still persist to keep storage in sync but avoid duplicate emissions
    persistLocale(matched);
    return;
  }
  state = {
    ...state,
    locale: matched,
    messages: resolveMessages(matched),
  };
  emit();
  if (options.persist !== false) {
    persistLocale(matched);
  }
}

export function getCurrentLocale() {
  return state.locale;
}

export function subscribeToLocaleChanges(cb: (next: I18nState) => void) {
  const handler = (next: unknown) => {
    if (typeof next === 'object' && next !== null) {
      cb(next as I18nState);
    }
  };
  return subscribe(LOCALE_TOPIC, handler);
}

const lookupMessage = (
  key: string,
  dictionary: MessageDictionary,
): string | undefined =>
  key.split('.').reduce<any>((acc, part) => {
    if (acc && typeof acc === 'object') {
      return acc[part];
    }
    return undefined;
  }, dictionary) as string | undefined;

const formatMessage = (
  template: string,
  values?: Record<string, string | number>,
) => {
  if (!values) return template;
  return template.replace(/\{([^}]+)\}/g, (match, token) => {
    const key = String(token).trim();
    const value = values[key];
    return value === undefined ? match : String(value);
  });
};

export interface UseI18nValue {
  locale: string;
  detectedLocale: string;
  availableLocales: typeof AVAILABLE_LOCALES;
  t: (key: string, options?: TranslateOptions) => string;
}

export function useI18n(): UseI18nValue {
  const [localState, setLocalState] = useState<I18nState>({ ...state });

  useEffect(() => {
    const unsubscribe = subscribe(LOCALE_TOPIC, (next) => {
      if (typeof next === 'object' && next !== null) {
        setLocalState(next as I18nState);
      }
    });
    hydrateFromStorage().then(() => {
      setLocalState({ ...state });
    });
    return unsubscribe;
  }, []);

  const t = useCallback(
    (key: string, options: TranslateOptions = {}) => {
      const raw = lookupMessage(key, localState.messages);
      const fallback = options.fallback ?? key;
      const template = typeof raw === 'string' ? raw : fallback;
      return formatMessage(template, options.values);
    },
    [localState.messages],
  );

  return useMemo(
    () => ({
      locale: localState.locale,
      detectedLocale: localState.detectedLocale,
      availableLocales: AVAILABLE_LOCALES,
      t,
    }),
    [localState.locale, localState.detectedLocale, t],
  );
}

export function __resetForTests() {
  hydrated = false;
  state = {
    locale: FALLBACK_LOCALE,
    detectedLocale: detectLocale(),
    messages: resolveMessages(FALLBACK_LOCALE),
  };
  emit();
}
