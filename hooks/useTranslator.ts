import { useCallback, useSyncExternalStore } from 'react';
import {
  getActiveLocale,
  setActiveLocale,
  subscribe,
  translateList,
  translateText,
  type Locale,
} from '../lib/i18n/store';

export function useTranslator() {
  const locale = useSyncExternalStore<Locale>(subscribe, getActiveLocale, getActiveLocale);

  const t = useCallback(
    (message: string) => translateText(message, locale),
    [locale],
  );

  const tList = useCallback(
    (values: readonly string[]) => translateList(values, locale),
    [locale],
  );

  return { locale, t, tList, setLocale: setActiveLocale };
}

export default useTranslator;
