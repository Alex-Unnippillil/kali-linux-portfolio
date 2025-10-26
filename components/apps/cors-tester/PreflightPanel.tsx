'use client';

import React, { useMemo } from 'react';

type Status = 'ok' | 'warn' | 'error';

export interface PreflightPanelProps {
  method: string;
  /** Origin that initiated the preflight request */
  origin?: string;
  /** Header names present on the actual request (e.g. "Content-Type") */
  requestHeaders: string[];
  /** Values from the Access-Control-Request-Headers preflight header */
  requestedHeaders: string[];
  /** Whether Access-Control-Allow-Credentials should be returned */
  allowCredentials?: boolean;
  /** Max age advertised to the browser */
  maxAgeSeconds?: number;
  /** Explicit allow-list of origins. `*` permits any origin. */
  allowedOrigins?: string[];
}

const ALLOWED_METHOD_LIST = ['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE'];
const ALLOWED_METHODS = new Set(ALLOWED_METHOD_LIST);
const FORBIDDEN_METHODS = new Set(['TRACE', 'TRACK', 'CONNECT']);
const SIMPLE_HEADERS = new Set(['accept', 'accept-language', 'content-language', 'content-type']);
const FORBIDDEN_HEADERS = new Set([
  'accept-charset',
  'accept-encoding',
  'access-control-request-headers',
  'access-control-request-method',
  'connection',
  'content-length',
  'cookie',
  'cookie2',
  'date',
  'dnt',
  'expect',
  'feature-policy',
  'host',
  'keep-alive',
  'origin',
  'referer',
  'te',
  'trailer',
  'transfer-encoding',
  'upgrade',
  'via',
]);

const statusTextStyles: Record<Status, string> = {
  ok: 'text-emerald-300',
  warn: 'text-amber-300',
  error: 'text-rose-400',
};

const statusBorderStyles: Record<Status, string> = {
  ok: 'border-emerald-500/40',
  warn: 'border-amber-500/40',
  error: 'border-rose-500/50',
};

const toHeaderCase = (header: string): string =>
  header
    .toLowerCase()
    .split('-')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join('-');

const sanitizeHeaderList = (values: string[]): string[] =>
  values
    .map((value) => value.split(':')[0]?.trim() ?? '')
    .map((value) => value.replace(/^"|"$/g, ''))
    .map((value) => value.toLowerCase())
    .filter(Boolean);

const parseCsv = (values: string[]): string[] =>
  values
    .flatMap((value) => value.split(','))
    .map((value) => value.trim())
    .filter(Boolean);

const normalizeOrigin = (origin?: string): string =>
  (origin ?? '').trim().replace(/\/$/, '').toLowerCase();

const clamp = (value: number, min: number, max: number): number =>
  Math.min(Math.max(value, min), max);

const unique = <T,>(items: T[]): T[] => Array.from(new Set(items));

const isForbiddenHeader = (header: string): boolean =>
  FORBIDDEN_HEADERS.has(header) || header.startsWith('proxy-') || header.startsWith('sec-');

const describeForbiddenHeaders = (headers: string[]): string =>
  headers.map(toHeaderCase).join(', ');

const describeHeaders = (headers: string[]): string =>
  headers.length ? headers.map(toHeaderCase).join(', ') : '∅';

const joinList = (values: string[]): string =>
  values.join(', ');

const originMatches = (origin: string, allowList: string[]): boolean => {
  const normalizedOrigin = normalizeOrigin(origin);
  const normalizedAllow = allowList.map((entry) => normalizeOrigin(entry));
  return (
    normalizedAllow.includes('*') ||
    (normalizedOrigin.length > 0 && normalizedAllow.includes(normalizedOrigin))
  );
};

const DEFAULT_ORIGINS = ['https://demo-client.app'];
const DEFAULT_MAX_AGE = 600;

const PreflightPanel: React.FC<PreflightPanelProps> = ({
  method,
  origin,
  requestHeaders,
  requestedHeaders,
  allowCredentials = false,
  maxAgeSeconds = DEFAULT_MAX_AGE,
  allowedOrigins,
}) => {
  const analysis = useMemo(() => {
    const normalizedMethod = method.trim().toUpperCase() || 'GET';
    const methodForbidden = FORBIDDEN_METHODS.has(normalizedMethod);
    const methodAllowed = ALLOWED_METHODS.has(normalizedMethod) && !methodForbidden;

    const methodList = methodAllowed
      ? unique([normalizedMethod, 'OPTIONS'])
      : unique([...ALLOWED_METHOD_LIST, 'OPTIONS']);

    let methodReason: string;
    let methodStatus: Status;
    if (methodForbidden) {
      methodStatus = 'error';
      methodReason = `${normalizedMethod} is blocked by browsers because it can expose proxy internals.`;
    } else if (!ALLOWED_METHODS.has(normalizedMethod)) {
      methodStatus = 'error';
      methodReason = `${normalizedMethod} is not enabled in this mock policy. Add it to the allow-list (${ALLOWED_METHOD_LIST.join(', ')}) to let the request through.`;
    } else {
      methodStatus = 'ok';
      methodReason = `${normalizedMethod} is listed as an allowed method and will be echoed back to the browser.`;
    }

    const headerCandidates = unique([
      ...sanitizeHeaderList(requestHeaders),
      ...sanitizeHeaderList(requestedHeaders),
      ...sanitizeHeaderList(parseCsv(requestedHeaders)),
    ]);

    const forbiddenHeaders = headerCandidates.filter(isForbiddenHeader);
    const filteredHeaders = headerCandidates.filter((header) => !isForbiddenHeader(header));

    const simpleHeaders = filteredHeaders.filter((header) => SIMPLE_HEADERS.has(header));
    const nonSimpleHeaders = filteredHeaders.filter((header) => !SIMPLE_HEADERS.has(header));

    const allowHeaders = unique(nonSimpleHeaders).map(toHeaderCase);

    let headersReason: string;
    let headersStatus: Status;
    if (forbiddenHeaders.length > 0) {
      headersStatus = 'error';
      headersReason = `Removed forbidden headers (${describeForbiddenHeaders(forbiddenHeaders)}). Browsers will refuse them on cross-origin requests.`;
    } else if (nonSimpleHeaders.length > 0) {
      headersStatus = 'ok';
      headersReason = `Non-simple headers (${describeHeaders(nonSimpleHeaders)}) must appear in Access-Control-Allow-Headers.`;
    } else if (filteredHeaders.length > 0) {
      headersStatus = 'warn';
      headersReason = `Only simple headers detected (${describeHeaders(simpleHeaders)}). They do not need to be listed explicitly.`;
    } else {
      headersStatus = 'warn';
      headersReason = 'No custom headers supplied. The browser will treat this as a simple request.';
    }

    const normalizedOrigin = origin ?? '';
    const sourceAllowList = (allowedOrigins ?? DEFAULT_ORIGINS)
      .map((entry) => entry.trim())
      .filter(Boolean);
    const usingDefaultOrigins = allowedOrigins === undefined;
    const allowList = usingDefaultOrigins
      ? sourceAllowList.length > 0
        ? sourceAllowList
        : DEFAULT_ORIGINS
      : sourceAllowList;
    const originAllowed = allowList.length > 0 && originMatches(normalizedOrigin, allowList);

    const hasWildcard = allowList.some((entry) => normalizeOrigin(entry) === '*');

    const allowOriginValue = originAllowed
      ? normalizedOrigin || '*'
      : hasWildcard
      ? '*'
      : 'null';
    const allowListLabel = allowList.length ? joinList(allowList) : '∅';

    const originStatus: Status = originAllowed ? 'ok' : 'error';
    const originReason = originAllowed
      ? `${normalizedOrigin || 'Any origin'} matches the allow-list.`
      : allowList.length === 0
      ? 'No origins are currently allowed by this policy.'
      : normalizedOrigin
      ? `${normalizedOrigin} is not on the allow-list (${allowListLabel}).`
      : 'No origin supplied. Provide one to see the exact echo value.';

    const clampedMaxAge = clamp(maxAgeSeconds, 0, 86400);
    const credentialStatus: Status = allowCredentials && allowOriginValue === '*'
      ? 'warn'
      : 'ok';
    const credentialReason = allowCredentials
      ? allowOriginValue === '*'
        ? 'Browsers ignore credentialed responses with a wildcard origin. Return a specific origin instead.'
        : 'Credentials are allowed. Ensure caching layers key on Origin.'
      : 'Credentials disabled. Responses remain broadly cacheable.';

    return {
      rows: [
        {
          header: 'Access-Control-Allow-Origin',
          value: allowOriginValue,
          status: originStatus,
          reason: originReason,
        },
        {
          header: 'Access-Control-Allow-Methods',
          value: methodList.join(', '),
          status: methodStatus,
          reason: methodReason,
        },
        {
          header: 'Access-Control-Allow-Headers',
          value: allowHeaders.length ? allowHeaders.join(', ') : '∅',
          status: headersStatus,
          reason: headersReason,
        },
        {
          header: 'Access-Control-Allow-Credentials',
          value: allowCredentials ? 'true' : 'false',
          status: credentialStatus,
          reason: credentialReason,
        },
        {
          header: 'Access-Control-Max-Age',
          value: `${clampedMaxAge}s`,
          status: 'ok' as Status,
          reason:
            clampedMaxAge === 0
              ? 'Zero seconds disables caching; the browser will preflight every request.'
              : `Caches the preflight result for ${clampedMaxAge} seconds.`,
        },
        {
          header: 'Vary',
          value: 'Origin',
          status: 'ok' as Status,
          reason: 'Ensures caches keep separate entries per requesting origin.',
        },
      ],
      simpleHeaders: unique(simpleHeaders.map(toHeaderCase)),
      nonSimpleHeaders: unique(nonSimpleHeaders.map(toHeaderCase)),
      forbiddenHeaders: unique(forbiddenHeaders.map(toHeaderCase)),
    };
  }, [
    allowCredentials,
    allowedOrigins,
    maxAgeSeconds,
    method,
    origin,
    requestHeaders,
    requestedHeaders,
  ]);

  return (
    <section className="space-y-4">
      <header className="space-y-1">
        <h2 className="text-lg font-semibold text-sky-200">Preflight Response Preview</h2>
        <p className="text-sm text-slate-300">
          The fields below mirror what an OPTIONS preflight response would look like for the current inputs.
        </p>
      </header>
      <div className="grid gap-3">
        {analysis.rows.map((row) => (
          <div
            key={row.header}
            className={`rounded border bg-slate-900/80 p-4 shadow-sm backdrop-blur ${statusBorderStyles[row.status]}`}
          >
            <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
              <div>
                <p className="text-xs uppercase tracking-wide text-slate-400">{row.header}</p>
                <p className="font-mono text-base text-sky-100">{row.value}</p>
              </div>
              <p className={`text-sm leading-relaxed md:w-1/2 ${statusTextStyles[row.status]}`}>{row.reason}</p>
            </div>
          </div>
        ))}
      </div>
      <footer className="rounded border border-slate-700/60 bg-slate-900/60 p-4 text-sm text-slate-300">
        <h3 className="mb-2 font-semibold text-slate-200">Header breakdown</h3>
        <dl className="grid gap-2 sm:grid-cols-3">
          <div>
            <dt className="text-xs uppercase tracking-wide text-slate-400">Non-simple</dt>
            <dd className="font-mono text-slate-200">{describeHeaders(analysis.nonSimpleHeaders)}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wide text-slate-400">Simple</dt>
            <dd className="font-mono text-slate-200">{describeHeaders(analysis.simpleHeaders)}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wide text-slate-400">Rejected</dt>
            <dd className="font-mono text-slate-200">{describeHeaders(analysis.forbiddenHeaders)}</dd>
          </div>
        </dl>
      </footer>
    </section>
  );
};

export default PreflightPanel;
