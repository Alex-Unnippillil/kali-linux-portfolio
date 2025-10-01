import React, { useMemo, useState } from 'react';
import { z } from 'zod';
import { toSimulationKey } from './simulations';

const SENSITIVE_HEADER_NAMES = new Set(
  ['authorization', 'proxy-authorization', 'cookie', 'set-cookie', 'x-api-key', 'x-amz-security-token', 'x-auth-token'].map(
    (name) => name.toLowerCase()
  )
);

const SENSITIVE_FIELD_MATCHERS = ['token', 'secret', 'password', 'session', 'auth'];

const HEADER_SCHEMA = z.object({
  name: z.string(),
  value: z.string(),
});

const QUERY_SCHEMA = z.object({
  name: z.string(),
  value: z.string(),
});

const POST_DATA_SCHEMA = z.object({
  mimeType: z.string(),
  text: z.string(),
});

const ENTRY_SCHEMA = z
  .object({
    startedDateTime: z.string(),
    time: z.number(),
    request: z.object({
      method: z.string(),
      url: z.string(),
      httpVersion: z.string(),
      headers: z.array(HEADER_SCHEMA),
      queryString: z.array(QUERY_SCHEMA),
      headersSize: z.number(),
      bodySize: z.number(),
      postData: POST_DATA_SCHEMA.optional(),
    }),
    response: z.object({
      status: z.number(),
      statusText: z.string(),
      httpVersion: z.string(),
      headers: z.array(HEADER_SCHEMA),
      content: z.object({
        size: z.number(),
        mimeType: z.string(),
        text: z.string().optional(),
      }),
      redirectURL: z.string(),
      headersSize: z.number(),
      bodySize: z.number(),
    }),
    cache: z.object({}).passthrough(),
    timings: z.object({
      send: z.number(),
      wait: z.number(),
      receive: z.number(),
    }),
    pageref: z.string(),
  })
  .passthrough();

const PAGE_SCHEMA = z.object({
  startedDateTime: z.string(),
  id: z.string(),
  title: z.string(),
  pageTimings: z.object({
    onContentLoad: z.number().nullable(),
    onLoad: z.number().nullable(),
  }),
});

const HAR_SCHEMA = z.object({
  log: z.object({
    version: z.string(),
    creator: z.object({
      name: z.string(),
      version: z.string(),
    }),
    pages: z.array(PAGE_SCHEMA),
    entries: z.array(ENTRY_SCHEMA),
  }),
});

export type HarLog = z.infer<typeof HAR_SCHEMA>;

export type SimulatedHeader = {
  name: string;
  value: string;
};

export type SimulatedHarRequest = {
  id: string;
  url: string;
  method: string;
  status: number;
  statusText: string;
  mimeType: string;
  resourceType: 'document' | 'script' | 'style' | 'image' | 'api' | 'font';
  startedDateTime: string;
  time: number;
  timings: {
    send: number;
    wait: number;
    receive: number;
  };
  requestHeaders: SimulatedHeader[];
  responseHeaders: SimulatedHeader[];
  responseSize: number;
  requestBodySize?: number;
  postData?: {
    mimeType: string;
    text: string;
  };
  contentText?: string;
  httpVersion?: string;
};

export type SimulatedHarPage = {
  id: string;
  url: string;
  title: string;
  requests: SimulatedHarRequest[];
};

const sanitizeHeaders = (headers: SimulatedHeader[]): SimulatedHeader[] =>
  headers.filter((header) => !SENSITIVE_HEADER_NAMES.has(header.name.toLowerCase()));

const shouldRedactKey = (key: string) =>
  SENSITIVE_FIELD_MATCHERS.some((matcher) => key.toLowerCase().includes(matcher));

const sanitizeStructuredData = (value: unknown): unknown => {
  if (Array.isArray(value)) {
    return value.map((item) => sanitizeStructuredData(item));
  }
  if (value && typeof value === 'object') {
    return Object.entries(value as Record<string, unknown>).reduce<Record<string, unknown>>((acc, [key, entryValue]) => {
      if (shouldRedactKey(key)) {
        acc[key] = '[redacted]';
        return acc;
      }
      acc[key] = sanitizeStructuredData(entryValue);
      return acc;
    }, {});
  }
  return value;
};

const sanitizePostData = (
  postData?: SimulatedHarRequest['postData']
): SimulatedHarRequest['postData'] | undefined => {
  if (!postData) {
    return undefined;
  }
  const { mimeType, text } = postData;
  if (!text.trim()) {
    return { mimeType, text };
  }
  try {
    if (mimeType.includes('json')) {
      const parsed = JSON.parse(text);
      const sanitized = sanitizeStructuredData(parsed);
      return { mimeType, text: JSON.stringify(sanitized) };
    }
    if (mimeType.includes('x-www-form-urlencoded')) {
      const params = new URLSearchParams(text);
      for (const [key] of params.entries()) {
        if (shouldRedactKey(key)) {
          params.set(key, '[redacted]');
        }
      }
      return { mimeType, text: params.toString() };
    }
  } catch {
    // ignore parse errors and fall through to returning original text
  }
  return { mimeType, text };
};

const toQueryString = (rawUrl: string) => {
  try {
    const parsed = new URL(rawUrl);
    return Array.from(parsed.searchParams.entries()).map(([name, value]) => ({ name, value }));
  } catch {
    return [];
  }
};

const sortByStart = (requests: SimulatedHarRequest[]) =>
  [...requests].sort((a, b) => Date.parse(a.startedDateTime) - Date.parse(b.startedDateTime));

const sumTimings = (request: SimulatedHarRequest) =>
  request.timings.send + request.timings.wait + request.timings.receive;

const toPageId = (url: string) =>
  url
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80) || 'firefox-session';

export const buildHarLog = (
  requests: SimulatedHarRequest[],
  options: { pageUrl: string; pageTitle: string; generatedAt: string; pageId?: string }
): HarLog => {
  const sorted = sortByStart(requests);
  const pageId = options.pageId ?? `page-${toPageId(options.pageUrl)}`;
  const firstStart = sorted.length > 0 ? Date.parse(sorted[0].startedDateTime) : null;
  const lastEnd = sorted.reduce<number | null>((latest, request) => {
    const start = Date.parse(request.startedDateTime);
    if (Number.isNaN(start)) {
      return latest;
    }
    const end = start + request.time;
    if (latest === null || end > latest) {
      return end;
    }
    return latest;
  }, firstStart);
  const totalDuration = firstStart !== null && lastEnd !== null ? Math.max(0, lastEnd - firstStart) : 0;

  const entries = sorted.map((request) => {
    const requestHeaders = sanitizeHeaders(request.requestHeaders);
    const responseHeaders = sanitizeHeaders(request.responseHeaders);
    const postData = sanitizePostData(request.postData);
    const httpVersion = request.httpVersion ?? 'HTTP/2';
    const queryString = toQueryString(request.url);

    const timingsTotal = sumTimings(request);
    const time = request.time > 0 ? request.time : Math.max(0, timingsTotal);

    return {
      startedDateTime: request.startedDateTime,
      time,
      request: {
        method: request.method,
        url: request.url,
        httpVersion,
        headers: requestHeaders,
        queryString,
        headersSize: -1,
        bodySize: postData ? request.requestBodySize ?? postData.text.length : 0,
        postData: postData ? { mimeType: postData.mimeType, text: postData.text } : undefined,
      },
      response: {
        status: request.status,
        statusText: request.statusText,
        httpVersion,
        headers: responseHeaders,
        content: {
          size: request.responseSize,
          mimeType: request.mimeType,
          text: request.contentText,
        },
        redirectURL: '',
        headersSize: -1,
        bodySize: request.responseSize,
      },
      cache: {},
      timings: {
        send: request.timings.send,
        wait: request.timings.wait,
        receive: request.timings.receive,
      },
      pageref: pageId,
      _resourceType: request.resourceType,
    };
  });

  const har = {
    log: {
      version: '1.2',
      creator: {
        name: 'Firefox Simulation',
        version: '1.0.0',
      },
      pages: [
        {
          startedDateTime: options.generatedAt,
          id: pageId,
          title: options.pageTitle,
          pageTimings: {
            onContentLoad: totalDuration,
            onLoad: totalDuration,
          },
        },
      ],
      entries,
    },
  };

  return HAR_SCHEMA.parse(har);
};

const formatBytes = (bytes: number) => {
  if (!Number.isFinite(bytes) || bytes <= 0) {
    return '0 B';
  }
  const units = ['B', 'KB', 'MB', 'GB'];
  const exponent = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const value = bytes / Math.pow(1024, exponent);
  const precision = value >= 10 || exponent === 0 ? 0 : 1;
  return `${value.toFixed(precision)} ${units[exponent]}`;
};

const toFileSlug = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60) || 'firefox-session';

const createHarPage = ({ id, ...page }: Omit<SimulatedHarPage, 'id'> & { id?: string }) => {
  const key = toSimulationKey(page.url);
  if (!key) {
    throw new Error(`Invalid simulated HAR URL: ${page.url}`);
  }
  return [key, { ...page, id: id ?? `page-${toPageId(page.url)}` } satisfies SimulatedHarPage] as const;
};

export const SIMULATED_HAR_PAGES = Object.fromEntries([
  createHarPage({
    id: 'page-kali-docs',
    url: 'https://www.kali.org/docs/',
    title: 'Kali Linux Documentation',
    requests: [
      {
        id: 'docs-html',
        url: 'https://www.kali.org/docs/',
        method: 'GET',
        status: 200,
        statusText: 'OK',
        mimeType: 'text/html; charset=utf-8',
        resourceType: 'document',
        startedDateTime: '2024-05-20T08:15:00.000Z',
        time: 320,
        timings: { send: 20, wait: 230, receive: 70 },
        requestHeaders: [
          {
            name: 'Accept',
            value: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
          },
          { name: 'User-Agent', value: 'Mozilla/5.0 (X11; Kali Linux) Gecko/20100101 Firefox/118.0' },
          { name: 'Accept-Language', value: 'en-US,en;q=0.9' },
          { name: 'Authorization', value: 'Bearer demo-docs-token' },
        ],
        responseHeaders: [
          { name: 'Content-Type', value: 'text/html; charset=utf-8' },
          { name: 'Cache-Control', value: 'max-age=600' },
          { name: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
          { name: 'Set-Cookie', value: 'kali_session=abc123; HttpOnly; Secure' },
        ],
        responseSize: 54210,
      },
      {
        id: 'docs-css',
        url: 'https://www.kali.org/_next/static/css/docs.css',
        method: 'GET',
        status: 200,
        statusText: 'OK',
        mimeType: 'text/css',
        resourceType: 'style',
        startedDateTime: '2024-05-20T08:15:00.120Z',
        time: 85,
        timings: { send: 5, wait: 45, receive: 35 },
        requestHeaders: [
          { name: 'Accept', value: 'text/css,*/*;q=0.1' },
          { name: 'Referer', value: 'https://www.kali.org/docs/' },
          { name: 'User-Agent', value: 'Mozilla/5.0 (X11; Kali Linux) Gecko/20100101 Firefox/118.0' },
          { name: 'X-API-Key', value: 'docs-secret-key' },
        ],
        responseHeaders: [
          { name: 'Content-Type', value: 'text/css' },
          { name: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
          { name: 'ETag', value: '"docs-css-20240520"' },
        ],
        responseSize: 4378,
      },
      {
        id: 'docs-navigation-api',
        url: 'https://www.kali.org/api/navigation?section=docs&format=json',
        method: 'POST',
        status: 200,
        statusText: 'OK',
        mimeType: 'application/json',
        resourceType: 'api',
        startedDateTime: '2024-05-20T08:15:00.260Z',
        time: 140,
        timings: { send: 15, wait: 90, receive: 35 },
        requestHeaders: [
          { name: 'Content-Type', value: 'application/json' },
          { name: 'Accept', value: 'application/json' },
          { name: 'User-Agent', value: 'Mozilla/5.0 (X11; Kali Linux) Gecko/20100101 Firefox/118.0' },
          { name: 'X-Auth-Token', value: 'super-secret' },
        ],
        responseHeaders: [
          { name: 'Content-Type', value: 'application/json' },
          { name: 'Cache-Control', value: 'no-store' },
        ],
        responseSize: 5120,
        requestBodySize: 118,
        postData: {
          mimeType: 'application/json',
          text: JSON.stringify({
            section: 'docs',
            token: 'should-be-hidden',
            filters: ['getting-started', 'security-baseline'],
          }),
        },
        contentText: JSON.stringify({
          items: 3,
          links: ['/docs/introduction/', '/docs/general-use/', '/docs/policy/'],
        }),
      },
    ],
  }),
  createHarPage({
    id: 'page-kali-home',
    url: 'https://www.kali.org/',
    title: 'Kali Linux Project',
    requests: [
      {
        id: 'home-html',
        url: 'https://www.kali.org/',
        method: 'GET',
        status: 200,
        statusText: 'OK',
        mimeType: 'text/html; charset=utf-8',
        resourceType: 'document',
        startedDateTime: '2024-05-20T09:30:00.000Z',
        time: 290,
        timings: { send: 18, wait: 210, receive: 62 },
        requestHeaders: [
          {
            name: 'Accept',
            value: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
          },
          { name: 'Accept-Language', value: 'en-US,en;q=0.9' },
          { name: 'Cookie', value: 'preview-session=xyz987; theme=dark' },
          { name: 'User-Agent', value: 'Mozilla/5.0 (X11; Kali Linux) Gecko/20100101 Firefox/118.0' },
        ],
        responseHeaders: [
          { name: 'Content-Type', value: 'text/html; charset=utf-8' },
          { name: 'Content-Encoding', value: 'br' },
          { name: 'Cache-Control', value: 'max-age=900' },
        ],
        responseSize: 48720,
      },
      {
        id: 'home-hero-image',
        url: 'https://www.kali.org/images/og/kali-linux-social.png',
        method: 'GET',
        status: 200,
        statusText: 'OK',
        mimeType: 'image/png',
        resourceType: 'image',
        startedDateTime: '2024-05-20T09:30:00.110Z',
        time: 120,
        timings: { send: 10, wait: 60, receive: 50 },
        requestHeaders: [
          { name: 'Accept', value: 'image/avif,image/webp,image/apng,image/*,*/*;q=0.8' },
          { name: 'Referer', value: 'https://www.kali.org/' },
          { name: 'User-Agent', value: 'Mozilla/5.0 (X11; Kali Linux) Gecko/20100101 Firefox/118.0' },
        ],
        responseHeaders: [
          { name: 'Content-Type', value: 'image/png' },
          { name: 'Cache-Control', value: 'public, max-age=86400' },
        ],
        responseSize: 225634,
      },
      {
        id: 'home-scripts',
        url: 'https://www.kali.org/_next/static/chunks/pages/index.js',
        method: 'GET',
        status: 200,
        statusText: 'OK',
        mimeType: 'application/javascript',
        resourceType: 'script',
        startedDateTime: '2024-05-20T09:30:00.180Z',
        time: 150,
        timings: { send: 8, wait: 100, receive: 42 },
        requestHeaders: [
          { name: 'Accept', value: '*/*' },
          { name: 'Referer', value: 'https://www.kali.org/' },
          { name: 'X-Amz-Security-Token', value: 'temporary-session-token' },
          { name: 'User-Agent', value: 'Mozilla/5.0 (X11; Kali Linux) Gecko/20100101 Firefox/118.0' },
        ],
        responseHeaders: [
          { name: 'Content-Type', value: 'application/javascript' },
          { name: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
        ],
        responseSize: 19230,
      },
      {
        id: 'home-announcements-api',
        url: 'https://www.kali.org/api/announcements?channel=stable',
        method: 'GET',
        status: 200,
        statusText: 'OK',
        mimeType: 'application/json',
        resourceType: 'api',
        startedDateTime: '2024-05-20T09:30:00.260Z',
        time: 180,
        timings: { send: 12, wait: 130, receive: 38 },
        requestHeaders: [
          { name: 'Accept', value: 'application/json' },
          { name: 'User-Agent', value: 'Mozilla/5.0 (X11; Kali Linux) Gecko/20100101 Firefox/118.0' },
        ],
        responseHeaders: [
          { name: 'Content-Type', value: 'application/json' },
          { name: 'Cache-Control', value: 'max-age=60' },
        ],
        responseSize: 3860,
        contentText: JSON.stringify({
          channel: 'stable',
          notices: ['2024.2 release live', 'New ARM builds available'],
        }),
      },
    ],
  }),
  createHarPage({
    id: 'page-ghdb',
    url: 'https://www.exploit-db.com/google-hacking-database',
    title: 'Exploit-DB Google Hacking Database',
    requests: [
      {
        id: 'ghdb-html',
        url: 'https://www.exploit-db.com/google-hacking-database',
        method: 'GET',
        status: 200,
        statusText: 'OK',
        mimeType: 'text/html; charset=utf-8',
        resourceType: 'document',
        startedDateTime: '2024-05-20T10:05:00.000Z',
        time: 360,
        timings: { send: 24, wait: 280, receive: 56 },
        requestHeaders: [
          {
            name: 'Accept',
            value: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
          },
          { name: 'Authorization', value: 'Bearer ghdb-preview' },
          { name: 'User-Agent', value: 'Mozilla/5.0 (X11; Kali Linux) Gecko/20100101 Firefox/118.0' },
        ],
        responseHeaders: [
          { name: 'Content-Type', value: 'text/html; charset=utf-8' },
          { name: 'Cache-Control', value: 'max-age=120' },
        ],
        responseSize: 60120,
      },
      {
        id: 'ghdb-search-api',
        url: 'https://www.exploit-db.com/ghdb/search',
        method: 'POST',
        status: 200,
        statusText: 'OK',
        mimeType: 'application/json',
        resourceType: 'api',
        startedDateTime: '2024-05-20T10:05:00.210Z',
        time: 210,
        timings: { send: 18, wait: 150, receive: 42 },
        requestHeaders: [
          { name: 'Content-Type', value: 'application/json' },
          { name: 'Accept', value: 'application/json' },
          { name: 'User-Agent', value: 'Mozilla/5.0 (X11; Kali Linux) Gecko/20100101 Firefox/118.0' },
        ],
        responseHeaders: [
          { name: 'Content-Type', value: 'application/json' },
          { name: 'Cache-Control', value: 'no-cache' },
        ],
        responseSize: 6840,
        requestBodySize: 102,
        postData: {
          mimeType: 'application/json',
          text: JSON.stringify({
            query: 'inurl:admin intitle:"login"',
            sessionSecret: 'ghdb-secret',
            limit: 5,
          }),
        },
        contentText: JSON.stringify({
          query: 'inurl:admin intitle:"login"',
          results: 5,
        }),
      },
      {
        id: 'ghdb-style',
        url: 'https://www.exploit-db.com/static/css/app.css',
        method: 'GET',
        status: 200,
        statusText: 'OK',
        mimeType: 'text/css',
        resourceType: 'style',
        startedDateTime: '2024-05-20T10:05:00.140Z',
        time: 90,
        timings: { send: 6, wait: 54, receive: 30 },
        requestHeaders: [
          { name: 'Accept', value: 'text/css,*/*;q=0.1' },
          { name: 'Referer', value: 'https://www.exploit-db.com/google-hacking-database' },
          { name: 'User-Agent', value: 'Mozilla/5.0 (X11; Kali Linux) Gecko/20100101 Firefox/118.0' },
        ],
        responseHeaders: [
          { name: 'Content-Type', value: 'text/css' },
          { name: 'Cache-Control', value: 'public, max-age=31536000' },
        ],
        responseSize: 8234,
      },
    ],
  }),
]) as Record<string, SimulatedHarPage>;

type FilterId = 'all' | 'document' | 'api' | 'assets';

type FilterOption = {
  id: FilterId;
  label: string;
  matches: (request: SimulatedHarRequest) => boolean;
};

const FILTER_OPTIONS: FilterOption[] = [
  { id: 'all', label: 'All', matches: () => true },
  { id: 'document', label: 'Documents', matches: (request) => request.resourceType === 'document' },
  { id: 'api', label: 'API', matches: (request) => request.resourceType === 'api' },
  {
    id: 'assets',
    label: 'Static assets',
    matches: (request) => ['style', 'script', 'image', 'font'].includes(request.resourceType),
  },
];

const computeRange = (requests: SimulatedHarRequest[]) => {
  if (requests.length === 0) {
    return null;
  }
  let earliest = Number.POSITIVE_INFINITY;
  let latest = 0;
  for (const request of requests) {
    const start = Date.parse(request.startedDateTime);
    if (!Number.isFinite(start)) {
      continue;
    }
    earliest = Math.min(earliest, start);
    const end = start + request.time;
    latest = Math.max(latest, end);
  }
  if (!Number.isFinite(earliest) || earliest === Number.POSITIVE_INFINITY || latest === 0) {
    return null;
  }
  return {
    start: earliest,
    end: latest,
    duration: Math.max(0, latest - earliest),
  };
};

type ExportHarProps = {
  currentUrl: string;
  simulationHeading?: string | null;
};

const ExportHAR: React.FC<ExportHarProps> = ({ currentUrl, simulationHeading }) => {
  const [filterId, setFilterId] = useState<FilterId>('all');
  const generatedAt = useMemo(() => new Date().toISOString(), []);

  const normalizedKey = useMemo(() => {
    if (!currentUrl) {
      return null;
    }
    try {
      return toSimulationKey(currentUrl);
    } catch {
      return null;
    }
  }, [currentUrl]);

  const page = normalizedKey ? SIMULATED_HAR_PAGES[normalizedKey] : undefined;
  const filterOption = useMemo(
    () => FILTER_OPTIONS.find((option) => option.id === filterId) ?? FILTER_OPTIONS[0],
    [filterId]
  );

  const filteredRequests = useMemo(() => {
    if (!page) {
      return [];
    }
    return page.requests.filter((request) => filterOption.matches(request));
  }, [page, filterOption]);

  const range = useMemo(() => computeRange(filteredRequests), [filteredRequests]);
  const totalTransfer = useMemo(
    () => filteredRequests.reduce((sum, request) => sum + request.responseSize, 0),
    [filteredRequests]
  );

  const harLog = useMemo(() => {
    if (!page) {
      return null;
    }
    const pageTitle = page.title || simulationHeading || 'Firefox simulation capture';
    return buildHarLog(filteredRequests, {
      pageUrl: page.url,
      pageTitle,
      generatedAt,
      pageId: page.id,
    });
  }, [page, filteredRequests, generatedAt, simulationHeading]);

  const hasRequests = filteredRequests.length > 0;
  const totalRequests = page?.requests.length ?? 0;
  const safeTitle = page?.title ?? simulationHeading ?? 'Firefox session';
  const downloadName = useMemo(() => {
    const slug = toFileSlug(safeTitle);
    const timestamp = generatedAt.replace(/[:.]/g, '-');
    return `${slug}-${filterOption.id}-${timestamp}.har`;
  }, [safeTitle, generatedAt, filterOption.id]);

  const exportDisabled = !harLog || !hasRequests;

  const handleExport = () => {
    if (exportDisabled || !harLog || typeof window === 'undefined') {
      return;
    }
    const fileContents = JSON.stringify(harLog, null, 2);
    const blob = new Blob([fileContents], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = downloadName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <section className="border-b border-gray-800 bg-gray-950 px-4 py-3 text-xs sm:text-sm">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="space-y-1">
          <p className="font-semibold uppercase tracking-wide text-gray-300">HAR Export</p>
          {page ? (
            <>
              <p className="text-[11px] text-gray-400 sm:text-xs">
                Generated {generatedAt} UTC • Filter: {filterOption.label}
              </p>
              {hasRequests ? (
                <>
                  <p className="text-[11px] text-gray-400 sm:text-xs">
                    Showing {filteredRequests.length} of {totalRequests} requests • {formatBytes(totalTransfer)} transferred
                  </p>
                  {range ? (
                    <p className="text-[11px] text-gray-500 sm:text-xs">
                      Capture window {new Date(range.start).toISOString()} → {new Date(range.end).toISOString()} ({range.duration} ms)
                    </p>
                  ) : null}
                </>
              ) : (
                <p className="text-[11px] text-amber-300 sm:text-xs">
                  No requests match the “{filterOption.label}” filter.
                </p>
              )}
            </>
          ) : (
            <p className="text-[11px] text-gray-400 sm:text-xs">
              HAR export is available for curated Kali Linux destinations. Use the simulation bookmarks to explore captured traces.
            </p>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex overflow-hidden rounded-md border border-gray-700 bg-gray-900 text-[11px] sm:text-xs">
            {FILTER_OPTIONS.map((option) => {
              const isActive = option.id === filterOption.id;
              return (
                <button
                  key={option.id}
                  type="button"
                  disabled={!page}
                  onClick={() => {
                    if (!page) {
                      return;
                    }
                    setFilterId(option.id);
                  }}
                  aria-pressed={isActive}
                  className={`px-3 py-1 transition ${
                    isActive ? 'bg-blue-500 text-white' : 'text-gray-300 hover:bg-gray-800'
                  } ${!page ? 'cursor-not-allowed opacity-50' : ''}`}
                >
                  {option.label}
                </button>
              );
            })}
          </div>
          <button
            type="button"
            onClick={handleExport}
            disabled={exportDisabled}
            className={`rounded-md px-3 py-1.5 font-medium transition ${
              exportDisabled
                ? 'cursor-not-allowed bg-gray-800 text-gray-500'
                : 'bg-blue-500 text-white hover:bg-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-300'
            }`}
          >
            Export HAR
          </button>
        </div>
      </div>
    </section>
  );
};

export default ExportHAR;
