import { isPseudoLocalized, pseudoLocalize } from './pseudoLocale';

export type Locale = 'en' | 'qps-ploc';

let activeLocale: Locale = 'en';
const listeners = new Set<() => void>();

export function getActiveLocale(): Locale {
  return activeLocale;
}

export function setActiveLocale(locale: Locale): void {
  if (activeLocale === locale) return;
  activeLocale = locale;
  listeners.forEach((listener) => listener());
}

export function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function translateText(message: string, localeOverride?: Locale): string {
  if (!message) return message;
  const locale = localeOverride ?? activeLocale;
  if (locale === 'qps-ploc') {
    if (isPseudoLocalized(message)) return message;
    return pseudoLocalize(message);
  }
  return message;
}

export function translateList(values: readonly string[], localeOverride?: Locale): string[] {
  const locale = localeOverride ?? activeLocale;
  return values.map((value) => translateText(value, locale));
}

export function isPseudoLocaleEnabled(): boolean {
  return activeLocale === 'qps-ploc';
}
