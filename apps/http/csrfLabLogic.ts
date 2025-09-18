export const TRUSTED_ORIGIN = 'https://bank.example';

export interface CsrfRules {
  requireSession: boolean;
  requireToken: boolean;
  checkOrigin: boolean;
  checkReferer: boolean;
}

export interface CsrfRequest {
  method: string;
  sessionCookie: string;
  csrfCookie: string;
  csrfHeader: string;
  origin: string;
  referer: string;
}

export interface EvaluationResult {
  ok: boolean;
  message: string;
}

interface RuleDefinition {
  id: keyof CsrfRules;
  label: string;
  detail: string;
}

const RULE_DEFINITIONS: RuleDefinition[] = [
  {
    id: 'requireSession',
    label: 'Require authenticated session',
    detail: 'Requests without the session cookie are rejected.',
  },
  {
    id: 'requireToken',
    label: 'Validate CSRF token',
    detail: 'X-CSRF-Token must match the csrfToken cookie value.',
  },
  {
    id: 'checkOrigin',
    label: 'Validate Origin header',
    detail: `Origin must equal ${TRUSTED_ORIGIN}.`,
  },
  {
    id: 'checkReferer',
    label: 'Validate Referer header',
    detail: `Referer must begin with ${TRUSTED_ORIGIN}.`,
  },
];

export interface RuleSummary extends RuleDefinition {
  enabled: boolean;
}

export const defaultRules: CsrfRules = {
  requireSession: true,
  requireToken: true,
  checkOrigin: false,
  checkReferer: false,
};

export const defaultRequest: CsrfRequest = {
  method: 'POST',
  sessionCookie: 'sessionId=abc123; Secure; SameSite=Strict',
  csrfCookie: 'demo-token',
  csrfHeader: 'demo-token',
  origin: 'https://evil.example',
  referer: 'https://evil.example/exploit',
};

export const summarizeRules = (rules: CsrfRules): RuleSummary[] =>
  RULE_DEFINITIONS.map((rule) => ({
    ...rule,
    enabled: rules[rule.id],
  }));

export function evaluateCsrfRequest(
  request: CsrfRequest,
  rules: CsrfRules,
): EvaluationResult {
  if (rules.requireSession && !request.sessionCookie.trim()) {
    return {
      ok: false,
      message: 'Rejected: a valid session cookie is required for this action.',
    };
  }

  if (rules.requireToken) {
    const headerToken = request.csrfHeader.trim();
    const cookieToken = request.csrfCookie.trim();
    if (!headerToken && !cookieToken) {
      return {
        ok: false,
        message:
          'Rejected: both the X-CSRF-Token header and csrfToken cookie are missing.',
      };
    }
    if (!headerToken) {
      return {
        ok: false,
        message: 'Rejected: X-CSRF-Token header is missing.',
      };
    }
    if (!cookieToken) {
      return {
        ok: false,
        message: 'Rejected: csrfToken cookie is missing.',
      };
    }
    if (headerToken !== cookieToken) {
      return {
        ok: false,
        message: `Rejected: token mismatch. Header value "${headerToken}" does not match cookie value "${cookieToken}".`,
      };
    }
  }

  if (rules.checkOrigin) {
    const origin = request.origin.trim();
    if (!origin) {
      return {
        ok: false,
        message:
          'Rejected: Origin header validation is enabled but the request omitted the Origin header.',
      };
    }
    if (origin !== TRUSTED_ORIGIN) {
      return {
        ok: false,
        message: `Rejected: Origin header "${origin}" did not match the trusted origin "${TRUSTED_ORIGIN}".`,
      };
    }
  }

  if (rules.checkReferer) {
    const referer = request.referer.trim();
    if (!referer) {
      return {
        ok: false,
        message:
          'Rejected: Referer validation is enabled but the request omitted the Referer header.',
      };
    }
    if (!referer.startsWith(TRUSTED_ORIGIN)) {
      return {
        ok: false,
        message: `Rejected: Referer header "${referer}" does not start with the trusted origin "${TRUSTED_ORIGIN}".`,
      };
    }
  }

  return {
    ok: true,
    message: 'Request accepted. All active CSRF defences passed.',
  };
}
