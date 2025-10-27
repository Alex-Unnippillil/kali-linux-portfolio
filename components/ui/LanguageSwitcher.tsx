"use client";

import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
} from 'react';
import { useRouter } from 'next/router';
import localesConfig from '../../locales.config.json';
import { announcePolite } from '../../utils/liveAnnouncer';

type LocaleConfigEntry =
  | string
  | {
      code: string;
      label: string;
      nativeLabel?: string;
      direction?: 'ltr' | 'rtl';
    };

type NormalizedLocale = {
  code: string;
  label: string;
  nativeLabel?: string;
  direction: 'ltr' | 'rtl';
};

const LOCAL_STORAGE_KEY = 'preferred-locale';
const COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 365; // 1 year

const normalizeLocales = (entries: LocaleConfigEntry[]): NormalizedLocale[] =>
  entries
    .map((entry) => {
      if (typeof entry === 'string') {
        return {
          code: entry,
          label: entry,
          nativeLabel: entry,
          direction: 'ltr' as const,
        } satisfies NormalizedLocale;
      }

      if (!entry || typeof entry.code !== 'string') {
        return null;
      }

      const direction = entry.direction === 'rtl' ? 'rtl' : 'ltr';
      return {
        code: entry.code,
        label: entry.label ?? entry.code,
        nativeLabel: entry.nativeLabel ?? entry.label ?? entry.code,
        direction,
      } satisfies NormalizedLocale;
    })
    .filter((entry): entry is NormalizedLocale => Boolean(entry));

const locales = normalizeLocales(
  Array.isArray(localesConfig?.locales) ? (localesConfig.locales as LocaleConfigEntry[]) : ['en'],
);

const resolveLocaleLabel = (locale: NormalizedLocale): string => {
  if (locale.nativeLabel && locale.nativeLabel !== locale.label) {
    return `${locale.label} (${locale.nativeLabel})`;
  }
  return locale.label;
};

const rtlPrefixes = ['ar', 'fa', 'he', 'ur'];

const applyDocumentLanguage = (locale: NormalizedLocale): void => {
  if (typeof document === 'undefined') return;
  document.documentElement.lang = locale.code;
  document.documentElement.setAttribute('data-locale', locale.code);
  const dir =
    locale.direction === 'rtl' ||
    rtlPrefixes.some((prefix) => locale.code.toLowerCase().startsWith(prefix))
      ? 'rtl'
      : 'ltr';
  document.documentElement.dir = dir;
};

const LanguageSwitcher = () => {
  const router = useRouter();
  const labelId = useId();
  const buttonId = useId();
  const listboxId = `${buttonId}-listbox`;
  const containerRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState<number>(0);
  const [selectedLocale, setSelectedLocale] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      try {
        const stored = window.localStorage.getItem(LOCAL_STORAGE_KEY);
        if (stored && locales.some((locale) => locale.code === stored)) {
          return stored;
        }
      } catch {
        // ignore storage errors
      }
    }
    if (typeof router?.locale === 'string') return router.locale;
    if (typeof router?.defaultLocale === 'string') return router.defaultLocale;
    if (typeof localesConfig?.defaultLocale === 'string') return localesConfig.defaultLocale;
    return locales[0]?.code ?? 'en';
  });

  const availableCodes = useMemo(
    () => new Set(locales.map((locale) => locale.code)),
    [],
  );

  const selectedIndex = useMemo(() => {
    const index = locales.findIndex((locale) => locale.code === selectedLocale);
    return index >= 0 ? index : 0;
  }, [selectedLocale]);

  useEffect(() => {
    const localeData = locales.find((locale) => locale.code === selectedLocale);
    if (localeData) {
      applyDocumentLanguage(localeData);
    }
  }, [selectedLocale]);

  useEffect(() => {
    if (!router?.isReady) return;

    let nextLocale = selectedLocale;
    if (typeof window !== 'undefined') {
      try {
        const stored = window.localStorage.getItem(LOCAL_STORAGE_KEY);
        if (stored && availableCodes.has(stored)) {
          nextLocale = stored;
        }
      } catch {
        // ignore storage errors
      }
    }

    if (!availableCodes.has(nextLocale)) {
      if (typeof router.locale === 'string' && availableCodes.has(router.locale)) {
        nextLocale = router.locale;
      } else if (
        typeof router.defaultLocale === 'string' &&
        availableCodes.has(router.defaultLocale)
      ) {
        nextLocale = router.defaultLocale;
      } else if (
        typeof localesConfig?.defaultLocale === 'string' &&
        availableCodes.has(localesConfig.defaultLocale)
      ) {
        nextLocale = localesConfig.defaultLocale;
      } else {
        nextLocale = locales[0]?.code ?? 'en';
      }
    }

    if (nextLocale !== selectedLocale) {
      setSelectedLocale(nextLocale);
    }
  }, [availableCodes, router.defaultLocale, router.isReady, router.locale, selectedLocale]);

  useEffect(() => {
    if (isOpen) {
      setActiveIndex(selectedIndex);
      requestAnimationFrame(() => {
        listRef.current?.focus();
      });
    }
    return undefined;
  }, [isOpen, selectedIndex]);

  useEffect(() => {
    if (!isOpen) return undefined;

    const handleClick = (event: MouseEvent | TouchEvent) => {
      if (!containerRef.current) return;
      if (!containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    const handleFocusIn = (event: FocusEvent) => {
      if (!containerRef.current) return;
      if (!containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    window.addEventListener('mousedown', handleClick);
    window.addEventListener('touchstart', handleClick);
    window.addEventListener('focusin', handleFocusIn);

    return () => {
      window.removeEventListener('mousedown', handleClick);
      window.removeEventListener('touchstart', handleClick);
      window.removeEventListener('focusin', handleFocusIn);
    };
  }, [isOpen]);

  const selectLocale = (locale: NormalizedLocale) => {
    setSelectedLocale(locale.code);
    setIsOpen(false);
    setActiveIndex(locales.findIndex((entry) => entry.code === locale.code));
    applyDocumentLanguage(locale);

    if (typeof window !== 'undefined') {
      try {
        window.localStorage.setItem(LOCAL_STORAGE_KEY, locale.code);
      } catch {
        // ignore storage errors
      }
      try {
        document.cookie = `NEXT_LOCALE=${encodeURIComponent(locale.code)}; Max-Age=${COOKIE_MAX_AGE_SECONDS}; Path=/; SameSite=Lax`;
      } catch {
        // ignore cookie errors
      }
    }

    announcePolite(`Language changed to ${resolveLocaleLabel(locale)}`);

    if (router && typeof router.replace === 'function') {
      const pathname = router.pathname ?? '/';
      const query = router.query ?? {};
      const asPath = router.asPath ?? pathname;
      void router
        .replace({ pathname, query }, asPath, { locale: locale.code, scroll: false })
        .catch((error) => {
          if (process.env.NODE_ENV !== 'production') {
            console.error('Failed to switch locale', error);
          }
        });
    }

    buttonRef.current?.focus();
  };

  const handleButtonKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    switch (event.key) {
      case 'ArrowDown':
      case 'ArrowUp':
        event.preventDefault();
        setIsOpen(true);
        setActiveIndex(selectedIndex);
        break;
      case 'Enter':
      case ' ':
        event.preventDefault();
        setIsOpen((prev) => !prev);
        break;
      case 'Escape':
        if (isOpen) {
          event.preventDefault();
          setIsOpen(false);
        }
        break;
      default:
        break;
    }
  };

  const handleListKeyDown = (event: KeyboardEvent<HTMLUListElement>) => {
    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        setActiveIndex((index) => (index + 1) % locales.length);
        break;
      case 'ArrowUp':
        event.preventDefault();
        setActiveIndex((index) => (index - 1 + locales.length) % locales.length);
        break;
      case 'Home':
        event.preventDefault();
        setActiveIndex(0);
        break;
      case 'End':
        event.preventDefault();
        setActiveIndex(locales.length - 1);
        break;
      case 'Enter':
      case ' ':
        event.preventDefault();
        selectLocale(locales[activeIndex]);
        break;
      case 'Escape':
        event.preventDefault();
        setIsOpen(false);
        buttonRef.current?.focus();
        break;
      case 'Tab':
        setIsOpen(false);
        break;
      default:
        break;
    }
  };

  const activeOptionId = `${listboxId}-option-${activeIndex}`;
  const selectedLocaleData = locales[selectedIndex] ?? locales[0];

  return (
    <div ref={containerRef} className="flex flex-col gap-1">
      <span id={labelId} className="text-xs font-medium uppercase tracking-wide text-[color:var(--kali-text-faint)]">
        Language
      </span>
      <button
        id={buttonId}
        ref={buttonRef}
        type="button"
        className="flex items-center justify-between rounded-md border border-[color:var(--kali-border)] bg-[color:var(--kali-panel)] px-3 py-2 text-left text-sm text-[color:var(--kali-text)] shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-focus-ring)]"
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-labelledby={`${labelId} ${buttonId}`}
        aria-controls={listboxId}
        onClick={() => {
          setIsOpen((prev) => !prev);
          if (!isOpen) {
            setActiveIndex(selectedIndex);
          }
        }}
        onKeyDown={handleButtonKeyDown}
      >
        <span>{resolveLocaleLabel(selectedLocaleData)}</span>
        <svg
          className="ml-2 h-4 w-4 text-[color:var(--kali-text-faint)]"
          viewBox="0 0 20 20"
          fill="currentColor"
          aria-hidden="true"
        >
          <path
            fillRule="evenodd"
            d="M5.23 7.21a.75.75 0 011.06.02L10 11.189l3.71-3.96a.75.75 0 011.08 1.04l-4.24 4.53a.75.75 0 01-1.08 0L5.21 8.27a.75.75 0 01.02-1.06z"
            clipRule="evenodd"
          />
        </svg>
      </button>
      {isOpen && (
        <ul
          role="listbox"
          id={listboxId}
          ref={listRef}
          tabIndex={-1}
          aria-labelledby={labelId}
          aria-activedescendant={activeOptionId}
          className="z-20 mt-1 max-h-56 overflow-auto rounded-md border border-[color:var(--kali-border)] bg-[color:var(--kali-surface)] py-1 text-sm shadow-lg focus:outline-none"
          onKeyDown={handleListKeyDown}
        >
          {locales.map((locale, index) => {
            const optionId = `${listboxId}-option-${index}`;
            const isSelected = selectedLocale === locale.code;
            const isActive = activeIndex === index;
            return (
              <li
                key={locale.code}
                id={optionId}
                role="option"
                aria-selected={isSelected}
                data-active={isActive ? 'true' : undefined}
                className={`flex cursor-pointer items-center justify-between px-3 py-2 transition-colors ${
                  isActive
                    ? 'bg-[color:color-mix(in_srgb,var(--kali-panel)_82%,rgba(255,255,255,0.12))] text-[color:var(--kali-text)]'
                    : 'text-[color:var(--kali-text)] hover:bg-[color:color-mix(in_srgb,var(--kali-panel)_90%,rgba(255,255,255,0.08))]'
                }`}
                onClick={() => selectLocale(locale)}
                onMouseEnter={() => setActiveIndex(index)}
              >
                <span>{resolveLocaleLabel(locale)}</span>
                {isSelected && (
                  <svg className="h-4 w-4 text-[color:var(--color-accent)]" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                    <path
                      fillRule="evenodd"
                      d="M16.704 5.29a1 1 0 010 1.42l-7.004 7.005a1 1 0 01-1.42 0L3.296 8.73a1 1 0 011.408-1.42l4.15 4.146 6.29-6.29a1 1 0 011.42 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
};

export default LanguageSwitcher;
