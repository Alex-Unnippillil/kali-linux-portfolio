import { pseudolocalize, PseudolocalizeOptions } from './pseudolocalize';

export type MessageDictionary = Record<string, string>;
export type MessageCatalog = Record<string, MessageDictionary>;
export type MessageValues = Record<string, string | number>;

const formatMessage = (template: string, values?: MessageValues): string => {
  if (!values) return template;
  return template.replace(/\{\s*([^{}\s]+)\s*\}/g, (match, key) => {
    const value = values[key as keyof MessageValues];
    if (value === undefined || value === null) {
      return match;
    }
    return String(value);
  });
};

export interface TranslatorOptions {
  locale: string;
  catalogs?: MessageCatalog;
  usePseudo?: boolean;
  fallbackLocale?: string;
  pseudoOptions?: PseudolocalizeOptions;
}

export interface Translator {
  t: (key: string, defaultMessage?: string, values?: MessageValues) => string;
}

export const createTranslator = ({
  locale,
  catalogs = {},
  usePseudo = false,
  fallbackLocale = 'en',
  pseudoOptions,
}: TranslatorOptions): Translator => {
  const currentCatalog = catalogs[locale] ?? {};
  const fallbackCatalog = catalogs[fallbackLocale] ?? {};

  const translate = (
    key: string,
    defaultMessage?: string,
    values?: MessageValues,
  ): string => {
    const template =
      currentCatalog[key] ?? fallbackCatalog[key] ?? defaultMessage ?? key;
    const formatted = formatMessage(template, values);
    if (usePseudo) {
      return pseudolocalize(formatted, pseudoOptions);
    }
    return formatted;
  };

  return { t: translate };
};

export const mergeCatalogs = (
  base: MessageCatalog,
  ...sources: MessageCatalog[]
): MessageCatalog => {
  return sources.reduce<MessageCatalog>((acc, source) => {
    const next = { ...acc };
    Object.keys(source).forEach(locale => {
      next[locale] = { ...(next[locale] ?? {}), ...source[locale] };
    });
    return next;
  }, { ...base });
};

export { pseudolocalize };
