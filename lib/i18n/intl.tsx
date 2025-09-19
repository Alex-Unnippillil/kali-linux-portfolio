'use client';

import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { createIntl, createIntlCache, type IntlShape } from '@formatjs/intl';
import { DEFAULT_LOCALE, messageCatalogs, resolveLocale, type SupportedLocale } from './messages';

const cache = createIntlCache();

const createIntlForLocale = (locale: SupportedLocale): IntlShape =>
  createIntl(
    {
      locale,
      messages: messageCatalogs[locale],
      onError: (err) => {
        if (process.env.NODE_ENV !== 'production') {
          console.error('Intl formatting error', err);
        }
      },
    },
    cache,
  );

const defaultIntl = createIntlForLocale(DEFAULT_LOCALE);

const IntlContext = createContext<IntlShape>(defaultIntl);

export const getIntl = (locale?: string): IntlShape => createIntlForLocale(resolveLocale(locale));

type IntlProviderProps = {
  locale?: string;
  children: ReactNode;
};

export const IntlProvider = ({ locale, children }: IntlProviderProps) => {
  const intl = useMemo(() => createIntlForLocale(resolveLocale(locale)), [locale]);

  return <IntlContext.Provider value={intl}>{children}</IntlContext.Provider>;
};

export const useIntl = (): IntlShape => useContext(IntlContext);
