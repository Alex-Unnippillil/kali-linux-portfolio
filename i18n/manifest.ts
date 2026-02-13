export type SupportedLocale = 'en' | 'es';

export interface PackManifestEntry {
  locale: SupportedLocale;
  path: string;
  integrity: string;
}

export const DEFAULT_LOCALE: SupportedLocale = 'en';

export const PACK_MANIFEST: Record<SupportedLocale, PackManifestEntry> = {
  en: {
    locale: 'en',
    path: '/i18n/packs/en.json',
    integrity: 'sha384-Cy0uSm8gLN43MfifLmiZi0rKYNUl/qgtaqjHJj2GouX+c7VrIJ5tytaYf8IctD79',
  },
  es: {
    locale: 'es',
    path: '/i18n/packs/es.json',
    integrity: 'sha384-1AzicERvpJrzQCwkTABGKZ/7JbIXKEMnpNGqZPQIKf+1ntDko0MyXxlr9AJAlaPS',
  },
};

export const SUPPORTED_LOCALES = Object.keys(PACK_MANIFEST) as SupportedLocale[];
