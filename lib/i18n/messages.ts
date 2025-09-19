export type SupportedLocale = 'en' | 'es';

export const DEFAULT_LOCALE: SupportedLocale = 'en';

export const messageIds = {
  currencyConverter: {
    title: 'currencyConverter.title',
    demoNotice: 'currencyConverter.demoNotice',
    amountLabel: 'currencyConverter.amountLabel',
    baseLabel: 'currencyConverter.baseLabel',
    quoteLabel: 'currencyConverter.quoteLabel',
    result: 'currencyConverter.result',
    lastUpdated: 'currencyConverter.lastUpdated',
    historyCount: 'currencyConverter.historyCount',
    chartLabel: 'currencyConverter.chartLabel',
  },
} as const;

type MessageCatalog = Record<string, string>;

export const messageCatalogs: Record<SupportedLocale, MessageCatalog> = {
  en: {
    [messageIds.currencyConverter.title]: 'Currency Converter',
    [messageIds.currencyConverter.demoNotice]: 'Demo rates',
    [messageIds.currencyConverter.amountLabel]: 'Amount',
    [messageIds.currencyConverter.baseLabel]: 'Base',
    [messageIds.currencyConverter.quoteLabel]: 'Quote',
    [messageIds.currencyConverter.result]: '{baseAmount} = {quoteAmount}',
    [messageIds.currencyConverter.lastUpdated]:
      'Last updated: {timestamp, date, medium} {timestamp, time, short}',
    [messageIds.currencyConverter.historyCount]:
      '{count, plural, =0 {No history yet} one {{count} saved rate} other {{count} saved rates}}',
    [messageIds.currencyConverter.chartLabel]: 'Exchange rate history',
  },
  es: {
    [messageIds.currencyConverter.title]: 'Conversor de divisas',
    [messageIds.currencyConverter.demoNotice]: 'Tipos de cambio de demostración',
    [messageIds.currencyConverter.amountLabel]: 'Cantidad',
    [messageIds.currencyConverter.baseLabel]: 'Base',
    [messageIds.currencyConverter.quoteLabel]: 'Cotización',
    [messageIds.currencyConverter.result]: '{baseAmount} = {quoteAmount}',
    [messageIds.currencyConverter.lastUpdated]:
      'Última actualización: {timestamp, date, medium} {timestamp, time, short}',
    [messageIds.currencyConverter.historyCount]:
      '{count, plural, =0 {Sin historial} one {{count} registro guardado} other {{count} registros guardados}}',
    [messageIds.currencyConverter.chartLabel]: 'Historial de tipos de cambio',
  },
};

export const supportedLocales = Object.keys(messageCatalogs) as SupportedLocale[];

export const resolveLocale = (locale?: string): SupportedLocale => {
  if (!locale) {
    return DEFAULT_LOCALE;
  }

  const normalized = locale.toLowerCase();
  const match = supportedLocales.find((supported) =>
    normalized === supported || normalized.startsWith(`${supported}-`),
  );

  return match ?? DEFAULT_LOCALE;
};
