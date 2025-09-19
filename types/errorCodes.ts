export enum ErrorCode {
  GLOBAL_APP_CRASH = 'APP-0001',
  ROUTE_RUNTIME_FAILURE = 'APP-0002',
  LEGACY_PAGE_CRASH = 'APP-0003',
  UNKNOWN = 'APP-9999',
}

type SeverityLevel = 'critical' | 'major' | 'minor';
type ErrorScope = 'global' | 'route' | 'legacy' | 'unknown';

export const SUPPORTED_LOCALES = ['en', 'es'] as const;
export type SupportedLocale = (typeof SUPPORTED_LOCALES)[number];

export interface LocalizedErrorCopy {
  readonly title: string;
  readonly description: string;
  readonly remediation: string;
}

export interface ErrorCatalogEntry {
  readonly code: ErrorCode;
  readonly severity: SeverityLevel;
  readonly scope: ErrorScope;
  readonly localizations: Record<SupportedLocale, LocalizedErrorCopy>;
  readonly supportNotes: readonly string[];
}

export interface LocalizedErrorCatalogEntry extends ErrorCatalogEntry {
  readonly locale: SupportedLocale;
  readonly copy: LocalizedErrorCopy;
}

const DEFAULT_LOCALE: SupportedLocale = 'en';

const errorCatalog: Record<ErrorCode, ErrorCatalogEntry> = {
  [ErrorCode.GLOBAL_APP_CRASH]: {
    code: ErrorCode.GLOBAL_APP_CRASH,
    severity: 'critical',
    scope: 'global',
    localizations: {
      en: {
        title: 'Critical application error',
        description:
          'The desktop shell encountered an unrecoverable problem while loading core services.',
        remediation:
          'Select “Try again” to reload the shell. If the error continues, clear your browser data or submit a bug report with this code.',
      },
      es: {
        title: 'Error crítico de la aplicación',
        description:
          'El escritorio encontró un problema irrecuperable mientras cargaba los servicios principales.',
        remediation:
          'Selecciona “Intentar de nuevo” para recargar la interfaz. Si el error continúa, borra los datos del navegador o envía un informe con este código.',
      },
    },
    supportNotes: [
      'Verify service-worker and analytics initialization logs for cascading failures.',
      'Check the correlated client payload for the failing route and recent deployment changes.',
    ],
  },
  [ErrorCode.ROUTE_RUNTIME_FAILURE]: {
    code: ErrorCode.ROUTE_RUNTIME_FAILURE,
    severity: 'major',
    scope: 'route',
    localizations: {
      en: {
        title: 'App window failed to load',
        description:
          'A specific application route threw an exception while rendering. The rest of the desktop may still work.',
        remediation:
          'Use “Try again” to reload the app. If the issue persists, capture the steps leading to the crash and report the code below.',
      },
      es: {
        title: 'La ventana de la aplicación no se cargó',
        description:
          'Una ruta de aplicación generó una excepción durante el renderizado. El resto del escritorio puede seguir funcionando.',
        remediation:
          'Usa “Intentar de nuevo” para recargar la aplicación. Si el problema continúa, anota los pasos que llevan al fallo e informa el código siguiente.',
      },
    },
    supportNotes: [
      'Reproduce the failure in the affected route and inspect server/client logs for the segment.',
      'Confirm that any required demo data or feature flags are available in the environment.',
    ],
  },
  [ErrorCode.LEGACY_PAGE_CRASH]: {
    code: ErrorCode.LEGACY_PAGE_CRASH,
    severity: 'major',
    scope: 'legacy',
    localizations: {
      en: {
        title: 'Classic page crashed unexpectedly',
        description:
          'A legacy page rendered through the classic router stopped responding due to an unexpected error.',
        remediation:
          'Refresh the page to reload the experience. If it fails repeatedly, open the page in a new tab and include the code when filing a bug.',
      },
      es: {
        title: 'Una página clásica falló de forma inesperada',
        description:
          'Una página heredada que usa el enrutador clásico dejó de responder por un error inesperado.',
        remediation:
          'Actualiza la página para recargar la experiencia. Si falla repetidamente, ábrela en una pestaña nueva e incluye el código al enviar el informe.',
      },
    },
    supportNotes: [
      'Check analytics events for the legacy page to confirm load order and asset availability.',
      'Review recent changes to shared providers used in the Pages router bundle.',
    ],
  },
  [ErrorCode.UNKNOWN]: {
    code: ErrorCode.UNKNOWN,
    severity: 'minor',
    scope: 'unknown',
    localizations: {
      en: {
        title: 'Unknown error',
        description:
          'An unexpected condition occurred and was not mapped to a known error code.',
        remediation:
          'Retry the last action. If the problem continues, share a bug report with this code and the steps you followed.',
      },
      es: {
        title: 'Error desconocido',
        description:
          'Ocurrió una condición inesperada que no está asociada a un código de error conocido.',
        remediation:
          'Vuelve a intentar la última acción. Si el problema continúa, comparte un informe con este código y los pasos que seguiste.',
      },
    },
    supportNotes: [
      'Classify the error during triage and update the catalog when a root cause is identified.',
      'Collect reproduction steps and environment details from the reporter.',
    ],
  },
};

function normalizeLocale(locale?: string): SupportedLocale | undefined {
  if (!locale) return undefined;
  const lowered = locale.toLowerCase();
  if (SUPPORTED_LOCALES.includes(lowered as SupportedLocale)) {
    return lowered as SupportedLocale;
  }
  const [base] = lowered.split('-');
  if (SUPPORTED_LOCALES.includes(base as SupportedLocale)) {
    return base as SupportedLocale;
  }
  return undefined;
}

function detectRuntimeLocale(): string | undefined {
  if (typeof navigator !== 'undefined' && typeof navigator.language === 'string') {
    return navigator.language;
  }
  if (typeof Intl !== 'undefined') {
    try {
      const resolved = Intl.DateTimeFormat().resolvedOptions().locale;
      if (resolved) return resolved;
    } catch {
      // ignore detection errors
    }
  }
  return undefined;
}

export function resolveLocale(preferredLocale?: string): SupportedLocale {
  const candidates = [preferredLocale, detectRuntimeLocale(), DEFAULT_LOCALE];
  for (const candidate of candidates) {
    const normalized = normalizeLocale(candidate);
    if (normalized) {
      return normalized;
    }
  }
  return DEFAULT_LOCALE;
}

export function getErrorCatalogEntry(code: ErrorCode): ErrorCatalogEntry {
  return errorCatalog[code] ?? errorCatalog[ErrorCode.UNKNOWN];
}

export function getLocalizedErrorEntry(
  code: ErrorCode,
  locale?: string
): LocalizedErrorCatalogEntry {
  const entry = getErrorCatalogEntry(code);
  const resolved = resolveLocale(locale);
  const copy = entry.localizations[resolved] ?? entry.localizations[DEFAULT_LOCALE];
  return {
    ...entry,
    locale: resolved,
    copy,
  };
}

export function isErrorCode(value: string | undefined | null): value is ErrorCode {
  if (!value) return false;
  return Object.prototype.hasOwnProperty.call(errorCatalog, value);
}

export function buildErrorReportUrl(code: ErrorCode): string {
  const params = new URLSearchParams({ preset: 'bug', errorCode: code });
  return `/input-hub?${params.toString()}`;
}

export function buildErrorReportTemplate(code: ErrorCode, locale?: string): string {
  const localized = getLocalizedErrorEntry(code, locale);
  const header = [`Error code: ${localized.code}`, `Severity: ${localized.severity}`, `Scope: ${localized.scope}`];
  const body = [localized.copy.description, '', `Remediation tried: ${localized.copy.remediation}`, '', 'Steps to reproduce:', '1. ', '2. ', '3. ', '', 'Expected result:', '', 'Additional notes:'];
  return [...header, '', ...body].join('\n');
}

export function listErrorCatalog(): ReadonlyArray<ErrorCatalogEntry> {
  return Object.values(errorCatalog);
}
