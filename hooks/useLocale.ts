import { useEffect, useState } from 'react';

export type TextDirection = 'ltr' | 'rtl';

interface LocaleInfo {
  locale: string;
  dir: TextDirection;
}

function detectLocale(): LocaleInfo {
  const { locale } = new Intl.DateTimeFormat().resolvedOptions();
  let dir: TextDirection = 'ltr';
  try {
    // @ts-expect-error Intl.Locale may not exist in older libs
    const intlLocale = new Intl.Locale(locale);
    dir = intlLocale?.textInfo?.direction || 'ltr';
  } catch {
    // Fallback for environments without Intl.Locale
    const rtlLangs = ['ar', 'he', 'fa', 'ur'];
    dir = rtlLangs.some((code) => locale.startsWith(code)) ? 'rtl' : 'ltr';
  }
  return { locale, dir };
}

export default function useLocale() {
  const [state, setState] = useState<LocaleInfo>(() => detectLocale());

  useEffect(() => {
    setState(detectLocale());
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute('dir', state.dir);
  }, [state.dir]);

  return state;
}
