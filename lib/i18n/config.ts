import i18next, { type i18n as I18nInstance } from 'i18next';
import { initReactI18next } from 'react-i18next';
import resourcesToBackend from 'i18next-resources-to-backend';
import {
  DEFAULT_LOCALE,
  DEFAULT_NAMESPACES,
  DEFAULT_NAMESPACE,
  SUPPORTED_LOCALES,
  type Namespace,
  type SupportedLocale,
} from './constants';
import { normalizeLocale, isSupportedLocale } from './utils';

const initialized = (() => {
  let promise: Promise<I18nInstance> | null = null;
  return () => {
    if (!promise) {
      promise = i18next
        .use(initReactI18next)
        .use(
          resourcesToBackend(async (language: string, namespace: string) => {
            try {
              const translationModule = await import(`../../locales/${language}/${namespace}.json`);
              return translationModule.default ?? translationModule;
            } catch (error) {
              if (language !== DEFAULT_LOCALE) {
                console.warn(`Missing translations for ${language}/${namespace}; falling back to ${DEFAULT_LOCALE}.`, error);
              }
              const fallbackModule = await import(`../../locales/${DEFAULT_LOCALE}/${namespace}.json`).catch(() => ({
                default: {},
              }));
              return fallbackModule.default ?? fallbackModule;
            }
          }),
        )
        .init({
          lng: DEFAULT_LOCALE,
          fallbackLng: DEFAULT_LOCALE,
          supportedLngs: Array.from(SUPPORTED_LOCALES),
          defaultNS: DEFAULT_NAMESPACE,
          ns: Array.from(DEFAULT_NAMESPACES),
          interpolation: { escapeValue: false },
          react: { useSuspense: false },
          returnEmptyString: false,
        });
    }
    return promise;
  };
})();

export function getI18n(): I18nInstance {
  void initialized();
  return i18next;
}

function ensureSupportedLocale(locale: string): SupportedLocale {
  const normalized = normalizeLocale(locale);
  return isSupportedLocale(normalized) ? normalized : DEFAULT_LOCALE;
}

function ensureNamespaces(namespaces?: string[]): string[] {
  const set = new Set<string>(DEFAULT_NAMESPACES);
  namespaces?.forEach((ns) => set.add(ns));
  return Array.from(set);
}

export async function activateLocale(
  locale: string,
  namespaces: string[] = Array.from(DEFAULT_NAMESPACES),
  initialStore?: Record<string, Record<string, unknown>>,
): Promise<I18nInstance> {
  const instance = await initialized();
  const targetLocale = ensureSupportedLocale(locale);
  const targetNamespaces = ensureNamespaces(namespaces);

  if (initialStore?.[targetLocale]) {
    Object.entries(initialStore[targetLocale]).forEach(([namespace, resources]) => {
      const ns = namespace as Namespace;
      if (!instance.hasResourceBundle(targetLocale, ns)) {
        instance.addResourceBundle(targetLocale, ns, resources, true, true);
      }
    });
  }

  await instance.loadNamespaces(targetNamespaces);
  if (instance.language !== targetLocale) {
    await instance.changeLanguage(targetLocale);
  }

  return instance;
}

export async function preloadTranslations(
  locale: string,
  namespaces: string[] = Array.from(DEFAULT_NAMESPACES),
): Promise<Record<string, Record<string, unknown>>> {
  const instance = await activateLocale(locale, namespaces);
  const store: Record<string, Record<string, unknown>> = {};
  const targetLocale = ensureSupportedLocale(locale);

  store[targetLocale] = store[targetLocale] ?? {};
  namespaces.forEach((namespace) => {
    const bundle = instance.getResourceBundle(targetLocale, namespace as Namespace);
    if (bundle) {
      store[targetLocale][namespace] = bundle;
    }
  });

  return store;
}
