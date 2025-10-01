"use client";

import { useEffect, useRef } from 'react';
import { useSettings } from '../../hooks/useSettings';
import { setActiveLocale, type Locale } from '../../lib/i18n/store';
import {
  disableDomPseudoLocalization,
  enableDomPseudoLocalization,
} from '../../lib/i18n/domPseudoLocalizer';

const DEFAULT_LANG = 'en';

export default function PseudoLocalizationManager() {
  const { pseudoLocale } = useSettings();
  const previousLang = useRef<string | null>(null);

  useEffect(() => {
    if (typeof document === 'undefined') return undefined;

    const nextLocale: Locale = pseudoLocale ? 'qps-ploc' : 'en';
    setActiveLocale(nextLocale);

    const html = document.documentElement;
    if (previousLang.current === null) {
      previousLang.current = html.getAttribute('lang');
    }

    html.setAttribute('lang', nextLocale === 'qps-ploc' ? 'qps-ploc' : previousLang.current || DEFAULT_LANG);
    html.setAttribute('data-pseudo-locale', pseudoLocale ? 'true' : 'false');

    if (pseudoLocale) {
      enableDomPseudoLocalization();
    } else {
      disableDomPseudoLocalization();
    }

    return () => {
      disableDomPseudoLocalization();
      html.setAttribute('data-pseudo-locale', 'false');
      html.setAttribute('lang', previousLang.current || DEFAULT_LANG);
      setActiveLocale('en');
    };
  }, [pseudoLocale]);

  return null;
}
