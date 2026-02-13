import { getHelpArticle, listHelpArticles, searchHelpArticles } from '../data/help';
import type { HelpArticle } from '../data/help';

export type ErrorSeverity = 'info' | 'warning' | 'error' | 'critical';

export type ErrorCode =
  | 'ERR_NETWORK_TIMEOUT'
  | 'ERR_ACCESS_DENIED'
  | 'ERR_DATA_INTEGRITY'
  | 'ERR_UNKNOWN';

export interface ErrorDefinition {
  code: ErrorCode;
  defaultMessage: string;
  severity: ErrorSeverity;
  articleSlug: string;
  shortTitle: string;
}

const ERROR_DEFINITIONS = {
  ERR_NETWORK_TIMEOUT: {
    code: 'ERR_NETWORK_TIMEOUT',
    defaultMessage: 'Network request timed out while contacting the server.',
    severity: 'warning',
    articleSlug: 'network-timeout',
    shortTitle: 'Network timeout',
  },
  ERR_ACCESS_DENIED: {
    code: 'ERR_ACCESS_DENIED',
    defaultMessage: 'You do not have permission to complete this action.',
    severity: 'error',
    articleSlug: 'access-denied',
    shortTitle: 'Access denied',
  },
  ERR_DATA_INTEGRITY: {
    code: 'ERR_DATA_INTEGRITY',
    defaultMessage: 'Integrity safeguards detected inconsistent cached data.',
    severity: 'error',
    articleSlug: 'data-integrity',
    shortTitle: 'Integrity warning',
  },
  ERR_UNKNOWN: {
    code: 'ERR_UNKNOWN',
    defaultMessage: 'An unexpected error occurred. Try again or review troubleshooting steps.',
    severity: 'critical',
    articleSlug: 'troubleshooting-basics',
    shortTitle: 'Unexpected error',
  },
} as const satisfies Record<ErrorCode, ErrorDefinition>;

export const ERROR_CODES: readonly ErrorCode[] = Object.freeze(
  Object.keys(ERROR_DEFINITIONS) as ErrorCode[]
);

export function isErrorCode(value: string): value is ErrorCode {
  return value in ERROR_DEFINITIONS;
}

export function getErrorDefinition(code: ErrorCode | string): ErrorDefinition {
  if (isErrorCode(code)) {
    return ERROR_DEFINITIONS[code];
  }

  return ERROR_DEFINITIONS.ERR_UNKNOWN;
}

export function getErrorHelpArticle(code: ErrorCode | string): HelpArticle | undefined {
  const definition = getErrorDefinition(code);
  return getHelpArticle(definition.articleSlug);
}

export function getHelpArticleBySlug(slug: string): HelpArticle | undefined {
  return getHelpArticle(slug);
}

export function getAllHelpArticles(): readonly HelpArticle[] {
  return listHelpArticles();
}

export { searchHelpArticles };
export type { HelpArticle };
