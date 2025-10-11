'use client';

import React, { useMemo, useRef, useState } from 'react';
import { z } from 'zod';
import TabbedWindow, { TabDefinition } from '../../components/ui/TabbedWindow';

type KeyValueRow = { id: number; key: string; value: string };

type RequestExample = {
  id: string;
  label: string;
  description: string;
  request: {
    method: SupportedMethod;
    url: string;
    queryParams?: Array<{ key: string; value: string }>;
    headers?: Array<{ key: string; value: string }>;
    body?: string;
  };
  response: {
    statusCode: number;
    statusText: string;
    latencyMs: number;
    headers: Array<{ key: string; value: string }>;
    body: string;
  };
};

const supportedMethods = [
  'GET',
  'POST',
  'PUT',
  'PATCH',
  'DELETE',
  'HEAD',
  'OPTIONS',
] as const;

type SupportedMethod = (typeof supportedMethods)[number];

const methodsWithBodies: Set<SupportedMethod> = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

const cannedResponses: RequestExample[] = [
  {
    id: 'json-placeholder-get',
    label: 'Sample: Fetch JSONPlaceholder post',
    description:
      'Simulated response for retrieving a single post from the JSONPlaceholder demo API.',
    request: {
      method: 'GET',
      url: 'https://jsonplaceholder.typicode.com/posts/1',
      headers: [{ key: 'Accept', value: 'application/json' }],
    },
    response: {
      statusCode: 200,
      statusText: 'OK',
      latencyMs: 42,
      headers: [
        { key: 'Content-Type', value: 'application/json; charset=utf-8' },
        { key: 'Cache-Control', value: 'max-age=600, public' },
      ],
      body: JSON.stringify(
        {
          userId: 1,
          id: 1,
          title: 'Mock post title',
          body: 'Offline fixture body rendered for demonstration purposes.',
        },
        null,
        2,
      ),
    },
  },
  {
    id: 'json-placeholder-post',
    label: 'Sample: Create JSONPlaceholder post',
    description:
      'Demonstrates crafting a POST request with a JSON payload and inspecting the mocked 201 Created response.',
    request: {
      method: 'POST',
      url: 'https://jsonplaceholder.typicode.com/posts',
      headers: [
        { key: 'Content-Type', value: 'application/json; charset=utf-8' },
        { key: 'Accept', value: 'application/json' },
      ],
      body: JSON.stringify(
        {
          title: 'Offline demo',
          body: 'This request never leaves the browser. Use it to practice payload composition.',
          userId: 99,
        },
        null,
        2,
      ),
    },
    response: {
      statusCode: 201,
      statusText: 'Created',
      latencyMs: 85,
      headers: [
        { key: 'Content-Type', value: 'application/json; charset=utf-8' },
        { key: 'Location', value: '/posts/101' },
      ],
      body: JSON.stringify(
        {
          id: 101,
          title: 'Offline demo',
          body: 'This request never leaves the browser. Use it to practice payload composition.',
          userId: 99,
        },
        null,
        2,
      ),
    },
  },
  {
    id: 'head-healthcheck',
    label: 'Sample: Service health check',
    description:
      'HEAD request used in health checks to verify uptime without downloading an entire payload.',
    request: {
      method: 'HEAD',
      url: 'https://status.example.com/healthz',
      headers: [{ key: 'User-Agent', value: 'OfflineStatusBot/1.0' }],
    },
    response: {
      statusCode: 204,
      statusText: 'No Content',
      latencyMs: 18,
      headers: [
        { key: 'Server', value: 'ExampleStatusEdge' },
        { key: 'X-Service-Revision', value: '2024.11.05' },
      ],
      body: 'This HEAD request does not return a body. Use status code and headers for diagnostics.',
    },
  },
];

type ValidationErrors = Record<string, string[]>;

const preparePairs = (rows: KeyValueRow[]) =>
  rows
    .map((row) => ({ key: row.key.trim(), value: row.value.trim() }))
    .filter((row) => row.key !== '' || row.value !== '');

const requestSchema = z
  .object({
    method: z.enum(supportedMethods),
    url: z
      .string()
      .trim()
      .min(1, 'URL is required')
      .refine((value) => {
        try {
          const parsed = new URL(value);
          return parsed.protocol === 'http:' || parsed.protocol === 'https:';
        } catch (error) {
          return false;
        }
      }, 'Enter a valid http(s) URL.'),
    queryParams: z
      .array(
        z.object({
          key: z.string().min(1, 'Query key is required'),
          value: z.string().min(1, 'Query value is required'),
        }),
      )
      .default([]),
    headers: z
      .array(
        z.object({
          key: z.string().min(1, 'Header name is required'),
          value: z.string().min(1, 'Header value is required'),
        }),
      )
      .default([]),
    body: z.string(),
  })
  .superRefine((data, ctx) => {
    const headerNames = new Set<string>();
    data.headers.forEach((header, index) => {
      const normalized = header.key.toLowerCase();
      if (headerNames.has(normalized)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Duplicate header "${header.key}"`,
          path: ['headers', index, 'key'],
        });
      } else {
        headerNames.add(normalized);
      }
    });

    const paramNames = new Set<string>();
    data.queryParams.forEach((param, index) => {
      const normalized = param.key.toLowerCase();
      if (paramNames.has(normalized)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Duplicate query parameter "${param.key}"`,
          path: ['queryParams', index, 'key'],
        });
      } else {
        paramNames.add(normalized);
      }
    });

    if (!methodsWithBodies.has(data.method) && data.body.trim().length > 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `${data.method} requests do not include a body. Remove the payload or choose a different method.`,
        path: ['body'],
      });
    }

    const contentTypeHeader = data.headers.find((header) => header.key.toLowerCase() === 'content-type');
    if (contentTypeHeader && contentTypeHeader.value.includes('application/json')) {
      if (data.body.trim().length === 0 && methodsWithBodies.has(data.method)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Provide a JSON body or switch to a method without a request payload.',
          path: ['body'],
        });
      } else if (data.body.trim().length > 0) {
        try {
          JSON.parse(data.body);
        } catch (error) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'Body must contain valid JSON when Content-Type is set to application/json.',
            path: ['body'],
          });
        }
      }
    }
  });

const formatIssues = (issues: z.ZodIssue[]): ValidationErrors => {
  return issues.reduce<ValidationErrors>((acc, issue) => {
    const path = issue.path.length > 0 ? issue.path.join('.') : 'form';
    if (!acc[path]) {
      acc[path] = [];
    }
    acc[path].push(issue.message);
    return acc;
  }, {});
};

const buildFullUrl = (baseUrl: string, queryParams: Array<{ key: string; value: string }>) => {
  if (queryParams.length === 0) {
    return baseUrl.trim();
  }

  try {
    const parsed = new URL(baseUrl);
    queryParams.forEach((param) => {
      parsed.searchParams.set(param.key, param.value);
    });
    return parsed.toString();
  } catch (error) {
    const queryString = queryParams
      .map((param) => `${encodeURIComponent(param.key)}=${encodeURIComponent(param.value)}`)
      .join('&');
    if (!queryString) {
      return baseUrl.trim();
    }
    const separator = baseUrl.includes('?') ? '&' : '?';
    return `${baseUrl.trim()}${separator}${queryString}`;
  }
};

const escapeSingleQuotes = (value: string) => value.replace(/'/g, "'\\''");

const buildCurlCommand = (data: {
  method: SupportedMethod;
  url: string;
  headers: Array<{ key: string; value: string }>;
  queryParams: Array<{ key: string; value: string }>;
  body: string;
}) => {
  const { method, url, headers, queryParams, body } = data;
  const finalUrl = buildFullUrl(url, queryParams);
  const segments: string[] = [`curl -X ${method}`, `'${escapeSingleQuotes(finalUrl)}'`];

  headers.forEach((header) => {
    segments.push(`-H '${escapeSingleQuotes(`${header.key}: ${header.value}`)}'`);
  });

  if (body.trim().length > 0) {
    segments.push(`-d '${escapeSingleQuotes(body)}'`);
  }

  return segments.join(' ');
};

const createRowFactory = () => {
  let counter = 0;
  return (key = '', value = ''): KeyValueRow => ({ id: counter++, key, value });
};

const createRow = createRowFactory();

type HistoryEntry = {
  id: string;
  timestamp: string;
  method: SupportedMethod;
  url: string;
  status: string;
  note: string;
};

const HTTPBuilder: React.FC = () => {
  const [method, setMethod] = useState<SupportedMethod>('GET');
  const [url, setUrl] = useState('');
  const [headers, setHeaders] = useState<KeyValueRow[]>([createRow()]);
  const [queryParams, setQueryParams] = useState<KeyValueRow[]>([createRow()]);
  const [body, setBody] = useState('');
  const [errors, setErrors] = useState<ValidationErrors>({});
  const [activeResponse, setActiveResponse] = useState<
    (RequestExample['response'] & { description?: string; sourceLabel: string }) | null
  >(null);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [selectedExampleId, setSelectedExampleId] = useState('');

  const preparedHeaders = useMemo(() => preparePairs(headers), [headers]);
  const preparedQueryParams = useMemo(() => preparePairs(queryParams), [queryParams]);

  const commandPreview = useMemo(
    () =>
      buildCurlCommand({
        method,
        url: url.trim() || 'https://example.com/api',
        headers: preparedHeaders,
        queryParams: preparedQueryParams,
        body,
      }),
    [method, url, preparedHeaders, preparedQueryParams, body],
  );

  const handleHeadersChange = (id: number, field: 'key' | 'value', value: string) => {
    setHeaders((current) => current.map((row) => (row.id === id ? { ...row, [field]: value } : row)));
  };

  const handleQueryParamsChange = (id: number, field: 'key' | 'value', value: string) => {
    setQueryParams((current) => current.map((row) => (row.id === id ? { ...row, [field]: value } : row)));
  };

  const removeHeader = (id: number) => {
    setHeaders((current) => {
      const next = current.filter((row) => row.id !== id);
      return next.length > 0 ? next : [createRow()];
    });
  };

  const removeQueryParam = (id: number) => {
    setQueryParams((current) => {
      const next = current.filter((row) => row.id !== id);
      return next.length > 0 ? next : [createRow()];
    });
  };

  const loadExample = (exampleId: string) => {
    setSelectedExampleId(exampleId);
    const example = cannedResponses.find((item) => item.id === exampleId);
    if (!example) {
      return;
    }

    setMethod(example.request.method);
    setUrl(example.request.url);
    setHeaders(
      (example.request.headers ?? []).map((header) => createRow(header.key, header.value)).concat(
        example.request.headers && example.request.headers.length > 0 ? [] : [createRow()],
      ),
    );
    setQueryParams(
      (example.request.queryParams ?? []).map((param) => createRow(param.key, param.value)).concat(
        example.request.queryParams && example.request.queryParams.length > 0 ? [] : [createRow()],
      ),
    );
    setBody(example.request.body ?? '');
    setErrors({});
    setActiveResponse(null);
  };

  const addHistoryEntry = (entry: HistoryEntry) => {
    setHistory((current) => [entry, ...current].slice(0, 10));
  };

  const submitForm = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const candidate = {
      method,
      url: url.trim(),
      headers: preparedHeaders,
      queryParams: preparedQueryParams,
      body,
    };

    const result = requestSchema.safeParse(candidate);
    if (!result.success) {
      setErrors(formatIssues(result.error.issues));
      setActiveResponse(null);
      return;
    }

    setErrors({});

    const normalizedUrl = buildFullUrl(result.data.url, result.data.queryParams);
    const matchingExample = cannedResponses.find((example) => {
      const exampleUrl = buildFullUrl(example.request.url, example.request.queryParams ?? []);
      return example.request.method === result.data.method && exampleUrl === normalizedUrl;
    });

    if (matchingExample) {
      setActiveResponse({
        ...matchingExample.response,
        description: matchingExample.description,
        sourceLabel: matchingExample.label,
      });
      addHistoryEntry({
        id: `${Date.now()}`,
        timestamp: new Date().toISOString(),
        method: result.data.method,
        url: normalizedUrl,
        status: `${matchingExample.response.statusCode} ${matchingExample.response.statusText}`,
        note: matchingExample.description,
      });
    } else {
      setActiveResponse({
        statusCode: 0,
        statusText: 'No canned response available',
        latencyMs: 0,
        headers: [],
        body:
          'Offline mode prevents live requests. Choose a canned example from the library or adjust the URL/method to match one.',
        sourceLabel: 'Offline fallback',
      });
      addHistoryEntry({
        id: `${Date.now()}`,
        timestamp: new Date().toISOString(),
        method: result.data.method,
        url: normalizedUrl,
        status: 'No canned response',
        note: 'No matching canned example. Request was not sent.',
      });
    }
  };

  const renderFieldErrors = (path: string) => {
    const fieldErrors = errors[path];
    if (!fieldErrors) {
      return null;
    }
    return (
      <ul className="mt-1 space-y-1 text-xs text-red-300" data-testid={`error-${path}`}>
        {fieldErrors.map((message, index) => (
          <li key={index}>{message}</li>
        ))}
      </ul>
    );
  };

  return (
    <div className="h-full bg-gray-900 p-4 text-white overflow-auto">
      <h1 className="mb-4 text-2xl">HTTP Request Builder</h1>
      <p className="mb-4 text-sm text-yellow-300">
        Build a curl command without sending any requests. Learn more at{' '}
        <a
          href="https://curl.se/"
          target="_blank"
          rel="noopener noreferrer"
          className="underline text-blue-400"
        >
          the curl project page
        </a>
        .
      </p>
      <div className="mb-6 rounded border border-gray-800 bg-gray-950 p-4">
        <label htmlFor="request-example" className="mb-2 block text-sm font-semibold text-gray-200">
          Canned request library
        </label>
        <select
          id="request-example"
          value={selectedExampleId}
          onChange={(event) => loadExample(event.target.value)}
          className="w-full rounded border border-gray-700 bg-gray-800 p-2 text-white"
        >
          <option value="">Select an example to pre-fill the form…</option>
          {cannedResponses.map((example) => (
            <option key={example.id} value={example.id}>
              {example.label}
            </option>
          ))}
        </select>
        {selectedExampleId && (
          <p className="mt-2 text-xs text-gray-300">
            {cannedResponses.find((example) => example.id === selectedExampleId)?.description}
          </p>
        )}
      </div>
      <form onSubmit={submitForm} className="space-y-6" data-testid="http-request-form">
        <div className="grid gap-6 lg:grid-cols-2">
          <section className="space-y-4">
            <div>
              <label htmlFor="http-method" className="mb-1 block text-sm font-medium">
                Method
              </label>
              <select
                id="http-method"
                className="w-full rounded border border-gray-700 bg-gray-800 p-2 text-white"
                value={method}
                onChange={(e) => setMethod(e.target.value as SupportedMethod)}
              >
                {supportedMethods.map((supportedMethod) => (
                  <option key={supportedMethod} value={supportedMethod}>
                    {supportedMethod}
                  </option>
                ))}
              </select>
              {renderFieldErrors('method')}
            </div>
            <div>
              <label htmlFor="http-url" className="mb-1 block text-sm font-medium">
                URL
              </label>
              <input
                id="http-url"
                type="url"
                className="w-full rounded border border-gray-700 bg-gray-800 p-2 text-white"
                placeholder="https://example.com/api"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
              />
              {renderFieldErrors('url')}
            </div>
            <div>
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium">Query parameters</label>
                <button
                  type="button"
                  onClick={() => setQueryParams((current) => [...current, createRow()])}
                  className="rounded border border-blue-500 px-2 py-1 text-xs text-blue-400 hover:bg-blue-500 hover:text-white"
                >
                  Add parameter
                </button>
              </div>
              <div className="mt-2 space-y-2">
                {queryParams.map((param, index) => (
                  <div key={param.id} className="grid gap-2 md:grid-cols-[1fr,1fr,auto]">
                    <input
                      type="text"
                      className="rounded border border-gray-700 bg-gray-800 p-2 text-white"
                      placeholder="key"
                      value={param.key}
                      onChange={(event) => handleQueryParamsChange(param.id, 'key', event.target.value)}
                    />
                    <input
                      type="text"
                      className="rounded border border-gray-700 bg-gray-800 p-2 text-white"
                      placeholder="value"
                      value={param.value}
                      onChange={(event) => handleQueryParamsChange(param.id, 'value', event.target.value)}
                    />
                    <button
                      type="button"
                      onClick={() => removeQueryParam(param.id)}
                      className="rounded border border-red-500 px-2 py-1 text-xs text-red-300 hover:bg-red-500 hover:text-white"
                      aria-label={`Remove query parameter ${index + 1}`}
                    >
                      Remove
                    </button>
                    {renderFieldErrors(`queryParams.${index}.key`)}
                    {renderFieldErrors(`queryParams.${index}.value`)}
                  </div>
                ))}
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium">Headers</label>
                <button
                  type="button"
                  onClick={() => setHeaders((current) => [...current, createRow()])}
                  className="rounded border border-blue-500 px-2 py-1 text-xs text-blue-400 hover:bg-blue-500 hover:text-white"
                >
                  Add header
                </button>
              </div>
              <div className="mt-2 space-y-2">
                {headers.map((header, index) => (
                  <div key={header.id} className="grid gap-2 md:grid-cols-[1fr,1fr,auto]">
                    <input
                      type="text"
                      className="rounded border border-gray-700 bg-gray-800 p-2 text-white"
                      placeholder="Header name"
                      value={header.key}
                      onChange={(event) => handleHeadersChange(header.id, 'key', event.target.value)}
                    />
                    <input
                      type="text"
                      className="rounded border border-gray-700 bg-gray-800 p-2 text-white"
                      placeholder="Header value"
                      value={header.value}
                      onChange={(event) => handleHeadersChange(header.id, 'value', event.target.value)}
                    />
                    <button
                      type="button"
                      onClick={() => removeHeader(header.id)}
                      className="rounded border border-red-500 px-2 py-1 text-xs text-red-300 hover:bg-red-500 hover:text-white"
                      aria-label={`Remove header ${index + 1}`}
                    >
                      Remove
                    </button>
                    {renderFieldErrors(`headers.${index}.key`)}
                    {renderFieldErrors(`headers.${index}.value`)}
                  </div>
                ))}
              </div>
            </div>
            <div>
              <label htmlFor="http-body" className="mb-1 block text-sm font-medium">
                Request body
              </label>
              <textarea
                id="http-body"
                rows={6}
                className="w-full rounded border border-gray-700 bg-gray-800 p-2 font-mono text-sm text-white"
                placeholder={'{"example": "payload"}'}
                value={body}
                onChange={(event) => setBody(event.target.value)}
              />
              {renderFieldErrors('body')}
            </div>
          </section>
          <section className="space-y-4">
            <div>
              <h2 className="mb-2 text-lg font-semibold">Command Preview</h2>
              <pre className="overflow-auto rounded bg-black p-3 font-mono text-green-400">
                {commandPreview}
              </pre>
            </div>
            <div className="rounded border border-gray-800 bg-gray-950 p-4">
              <h3 className="text-lg font-semibold">Response simulator</h3>
              {activeResponse ? (
                <div className="mt-3 space-y-3">
                  <div>
                    <p className="text-sm">
                      <span className="font-medium">Status:</span>{' '}
                      {activeResponse.statusCode > 0
                        ? `${activeResponse.statusCode} ${activeResponse.statusText}`
                        : activeResponse.statusText}
                    </p>
                    {activeResponse.latencyMs > 0 && (
                      <p className="text-xs text-gray-300">Simulated latency: {activeResponse.latencyMs} ms</p>
                    )}
                    <p className="text-xs text-gray-400">Source: {activeResponse.sourceLabel}</p>
                  </div>
                  {activeResponse.description && (
                    <p className="rounded border border-gray-800 bg-gray-900 p-2 text-xs text-gray-200">
                      {activeResponse.description}
                    </p>
                  )}
                  {activeResponse.headers.length > 0 && (
                    <div>
                      <h4 className="text-sm font-semibold">Headers</h4>
                      <ul className="mt-1 space-y-1 text-xs text-gray-200">
                        {activeResponse.headers.map((header) => (
                          <li key={`${header.key}:${header.value}`}>
                            <span className="font-medium">{header.key}:</span> {header.value}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  <div>
                    <h4 className="text-sm font-semibold">Body</h4>
                    <pre className="mt-1 max-h-60 overflow-auto rounded bg-black p-3 text-xs text-green-300">
                      {activeResponse.body}
                    </pre>
                  </div>
                </div>
              ) : (
                <p className="mt-3 text-sm text-gray-300">
                  Submit the form to view a simulated response. Offline fixtures mirror common API workflows.
                </p>
              )}
            </div>
          </section>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="submit"
            className="rounded bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-500"
          >
            Simulate request
          </button>
          <p className="text-xs text-gray-400">
            Validation runs locally. No network calls are ever made from this tool.
          </p>
        </div>
      </form>
      <section className="mt-8 rounded border border-gray-800 bg-gray-950 p-4">
        <h2 className="text-lg font-semibold">Simulation history</h2>
        {history.length === 0 ? (
          <p className="mt-2 text-sm text-gray-300">Run a simulation to record the request details here.</p>
        ) : (
          <ol className="mt-3 space-y-3 text-sm">
            {history.map((entry) => (
              <li
                key={entry.id}
                className="rounded border border-gray-800 bg-gray-900 p-3"
                data-testid="history-entry"
              >
                <p>
                  <span className="font-semibold">{entry.method}</span>{' '}
                  <span className="text-blue-300">{entry.url}</span>
                </p>
                <p className="text-xs text-gray-400">
                  {new Date(entry.timestamp).toLocaleString()} · {entry.status}
                </p>
                <p className="text-xs text-gray-300">{entry.note}</p>
              </li>
            ))}
          </ol>
        )}
      </section>
    </div>
  );
};

const HTTPPreview: React.FC = () => {
  const countRef = useRef(1);

  const createTab = (): TabDefinition => {
    const id = Date.now().toString();
    return { id, title: `Request ${countRef.current++}`, content: <HTTPBuilder /> };
  };

  return (
    <TabbedWindow
      className="min-h-screen bg-gray-900 text-white"
      initialTabs={[createTab()]}
      onNewTab={createTab}
    />
  );
};

export { HTTPBuilder, cannedResponses, supportedMethods };

export default HTTPPreview;
