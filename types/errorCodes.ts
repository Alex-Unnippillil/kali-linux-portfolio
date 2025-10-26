export const SUPPORTED_LOCALES = ['en', 'es'] as const;
export type Locale = (typeof SUPPORTED_LOCALES)[number];
export const DEFAULT_LOCALE: Locale = 'en';

export type LocalizedText = Partial<Record<Locale, string>> & {
  [DEFAULT_LOCALE]: string;
};

export enum ErrorCode {
  UI_UNEXPECTED = 'ERR-UI-001',
  CONTACT_SERVICE_UNAVAILABLE = 'ERR-CONTACT-001',
  CONTACT_DELIVERY_FAILED = 'ERR-CONTACT-002',
}

export interface ErrorCatalogEntry {
  summary: LocalizedText;
  remediation: LocalizedText;
  area: 'ui' | 'messaging';
}

export const ERROR_CATALOG: Record<ErrorCode, ErrorCatalogEntry> = {
  [ErrorCode.UI_UNEXPECTED]: {
    area: 'ui',
    summary: {
      en: 'Unexpected interface error',
      es: 'Error inesperado de la interfaz',
    },
    remediation: {
      en: 'Refresh the page or reopen the app. If the problem persists, capture steps to reproduce and include the error code when you contact support.',
      es: 'Actualice la página o vuelva a abrir la aplicación. Si el problema continúa, documente los pasos para reproducirlo e incluya el código de error al contactar con soporte.',
    },
  },
  [ErrorCode.CONTACT_SERVICE_UNAVAILABLE]: {
    area: 'messaging',
    summary: {
      en: 'Message service is offline',
      es: 'El servicio de mensajes está fuera de línea',
    },
    remediation: {
      en: 'Wait a few minutes and try again. If the issue remains, verify the EmailJS credentials in the environment and notify the support team with this code.',
      es: 'Espere unos minutos y vuelva a intentarlo. Si el problema continúa, verifique las credenciales de EmailJS en el entorno y avise al equipo de soporte con este código.',
    },
  },
  [ErrorCode.CONTACT_DELIVERY_FAILED]: {
    area: 'messaging',
    summary: {
      en: 'Message delivery failed',
      es: 'El envío del mensaje falló',
    },
    remediation: {
      en: 'Retry sending the message. If it fails again, enable reCAPTCHA if available and include this code in your support ticket.',
      es: 'Intente enviar el mensaje nuevamente. Si vuelve a fallar, active reCAPTCHA si está disponible e incluya este código en su ticket de soporte.',
    },
  },
};

export const getSupportedLocales = () => [...SUPPORTED_LOCALES];

export const matchLocale = (candidate?: string): Locale => {
  if (!candidate) return DEFAULT_LOCALE;
  const lowered = candidate.toLowerCase();
  const found = SUPPORTED_LOCALES.find((locale) => lowered.startsWith(locale));
  return found ?? DEFAULT_LOCALE;
};

export interface LocalizedErrorCopy {
  code: ErrorCode;
  summary: string;
  remediation: string;
  locale: Locale;
  area: ErrorCatalogEntry['area'];
}

export const getLocalizedErrorCopy = (
  code: ErrorCode,
  locale: Locale = DEFAULT_LOCALE
): LocalizedErrorCopy => {
  const entry = ERROR_CATALOG[code];
  const resolvedLocale = entry.summary[locale] ? locale : DEFAULT_LOCALE;
  return {
    code,
    area: entry.area,
    locale: resolvedLocale,
    summary: entry.summary[resolvedLocale] ?? entry.summary[DEFAULT_LOCALE],
    remediation:
      entry.remediation[resolvedLocale] ?? entry.remediation[DEFAULT_LOCALE],
  };
};

export const isErrorCode = (value: unknown): value is ErrorCode =>
  typeof value === 'string' &&
  (Object.values(ErrorCode) as string[]).includes(value);

export const listErrorCodes = (): ErrorCode[] =>
  Object.values(ErrorCode);
