'use client';

import React, { useCallback, useMemo, useRef, useState } from 'react';
import TabbedWindow, { TabDefinition } from '../../components/ui/TabbedWindow';

type HeaderRow = {
  id: number;
  name: string;
  value: string;
};

type Preset = {
  id: string;
  label: string;
  method: string;
  url: string;
  headers: Array<Pick<HeaderRow, 'name' | 'value'>>;
  body?: string;
};

const PRESETS: Preset[] = [
  {
    id: 'custom',
    label: 'Start from scratch',
    method: 'GET',
    url: '',
    headers: [],
    body: '',
  },
  {
    id: 'whoami',
    label: 'GET https://ifconfig.me (text/plain)',
    method: 'GET',
    url: 'https://ifconfig.me',
    headers: [
      { name: 'Accept', value: 'text/plain' },
      { name: 'User-Agent', value: 'curl/8.5.0' },
    ],
    body: '',
  },
  {
    id: 'json-placeholder',
    label: 'POST https://jsonplaceholder.typicode.com/posts',
    method: 'POST',
    url: 'https://jsonplaceholder.typicode.com/posts',
    headers: [
      { name: 'Content-Type', value: 'application/json; charset=UTF-8' },
    ],
    body: '{"title":"demo","body":"example","userId":1}',
  },
  {
    id: 'kali-repo',
    label: 'HEAD https://http.kali.org (cache inspection)',
    method: 'HEAD',
    url: 'https://http.kali.org/',
    headers: [
      { name: 'Accept', value: 'application/json' },
      { name: 'Cache-Control', value: 'no-cache' },
    ],
    body: '',
  },
];

const URL_PLACEHOLDER = '<url>';

export const HTTPBuilder: React.FC = () => {
  const headerIdRef = useRef(0);
  const createHeaderRow = useCallback(
    (name = '', value = ''): HeaderRow => {
      headerIdRef.current += 1;
      return { id: headerIdRef.current, name, value };
    },
    []
  );
  const [method, setMethod] = useState('GET');
  const [url, setUrl] = useState('');
  const [headers, setHeaders] = useState<HeaderRow[]>([
    createHeaderRow('', ''),
  ]);
  const [isHeadersOpen, setHeadersOpen] = useState(false);
  const [isBodyOpen, setBodyOpen] = useState(false);
  const [body, setBody] = useState('');
  const [selectedPreset, setSelectedPreset] = useState(PRESETS[0].id);

  const markCustom = useCallback(() => {
    setSelectedPreset('custom');
  }, []);

  const applyPreset = useCallback(
    (presetId: string) => {
      const preset = PRESETS.find((item) => item.id === presetId);
      if (!preset) {
        return;
      }

      setMethod(preset.method);
      setUrl(preset.url);
      setBody(preset.body ?? '');

      setHeaders(() => {
        if (preset.headers.length === 0) {
          return [createHeaderRow('', '')];
        }
        return preset.headers.map((header) =>
          createHeaderRow(header.name, header.value)
        );
      });
    },
    [createHeaderRow]
  );

  const handlePresetChange = (presetId: string) => {
    setSelectedPreset(presetId);
    applyPreset(presetId);
  };

  const sanitizedHeaders = useMemo(
    () =>
      headers.filter((header) => header.name.trim() || header.value.trim()),
    [headers]
  );

  const commandParts = useMemo(() => {
    const headerSegments = sanitizedHeaders.map(
      (header) => `-H '${header.name.trim()}: ${header.value.trim()}'`
    );
    const urlSegment = url.trim() ? `'${url.trim()}'` : URL_PLACEHOLDER;
    const bodySegment = body.trim()
      ? [`--data '${body.trim().replace(/'/g, "'\\''")}'`]
      : [];

    return ['curl', '-X', method, ...headerSegments, urlSegment, ...bodySegment];
  }, [body, method, sanitizedHeaders, url]);

  const command = useMemo(() => commandParts.join(' '), [commandParts]);

  const copyToClipboard = async () => {
    try {
      if (typeof navigator === 'undefined' || !navigator.clipboard?.writeText) {
        return;
      }
      await navigator.clipboard.writeText(command);
    } catch (error) {
      // Clipboard access can fail silently in some environments.
    }
  };

  const addHeaderRow = () => {
    markCustom();
    setHeaders((prev) => [...prev, createHeaderRow('', '')]);
  };

  const updateHeaderRow = (
    id: number,
    field: 'name' | 'value',
    value: string
  ) => {
    markCustom();
    setHeaders((prev) =>
      prev.map((header) =>
        header.id === id ? { ...header, [field]: value } : header
      )
    );
  };

  const removeHeaderRow = (id: number) => {
    markCustom();
    setHeaders((prev) => (prev.length > 1 ? prev.filter((h) => h.id !== id) : prev));
  };

  const timelineSteps = useMemo(() => {
    const headerSummary = sanitizedHeaders.length
      ? sanitizedHeaders
          .map((header) => `${header.name.trim()}: ${header.value.trim()}`)
          .join(', ')
      : 'No custom headers';

    return [
      {
        id: 'compose',
        title: 'Compose request',
        detail: `${method.toUpperCase()} → ${
          url.trim() || URL_PLACEHOLDER
        }`,
      },
      {
        id: 'headers',
        title: 'Attach headers',
        detail: headerSummary,
      },
      {
        id: 'body',
        title: 'Payload check',
        detail: body.trim()
          ? `JSON body with ${body.trim().length} characters`
          : 'No body included',
      },
      {
        id: 'launch',
        title: 'Ready to execute',
        detail:
          'Use the command below in a terminal. Network calls remain simulated in this workspace.',
      },
    ];
  }, [body, method, sanitizedHeaders, url]);

  return (
    <div className="h-full overflow-auto bg-kali-dark p-6 text-kali-text">
      <header className="mb-6 space-y-3">
        <span className="inline-flex items-center rounded-full border border-kali-primary/40 bg-kali-primary-surface px-3 py-1 text-[0.65rem] font-semibold uppercase tracking-[0.28em] text-kali-primary">
          HTTP Toolkit
        </span>
        <h1 className="text-2xl font-semibold">HTTP Request Builder</h1>
        <p className="text-sm text-kali-muted">
          Build and study curl commands without sending live traffic. Learn more at{' '}
          <a
            href="https://curl.se/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-kali-info underline decoration-dotted underline-offset-4 transition-colors hover:text-kali-text"
          >
            the curl project page
          </a>
          .
        </p>
      </header>
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
        <section className="rounded-2xl border border-kali-panel-border bg-kali-panel shadow-kali-panel">
          <div className="flex items-center justify-between gap-3 border-b border-kali-primary/25 px-6 py-4">
            <div className="flex items-center gap-3">
              <span className="inline-flex items-center rounded-full border border-kali-primary/40 bg-kali-primary-surface px-2 py-0.5 text-[0.6rem] font-semibold uppercase tracking-[0.28em] text-kali-primary">
                Request
              </span>
              <h2 className="text-sm font-semibold text-kali-primary">Compose simulated call</h2>
            </div>
            <p className="text-xs text-kali-primary opacity-70">No network traffic is sent</p>
          </div>
          <form
            onSubmit={(e) => e.preventDefault()}
            className="space-y-6 px-6 pb-6 pt-5"
          >
            <div className="grid gap-4 lg:grid-cols-[minmax(0,220px)_1fr]">
              <div className="space-y-2">
                <label
                  id="http-preset-label"
                  htmlFor="http-preset"
                  className="text-xs font-semibold uppercase tracking-[0.18em] text-kali-muted"
                >
                  Preset selection
                </label>
                <select
                  id="http-preset"
                  className="w-full rounded-lg border border-kali-panel-border bg-kali-overlay p-2 text-sm text-kali-text transition-colors focus:border-kali-control focus:outline-none focus-visible:ring-2 focus-visible:ring-kali-focus/80 focus-visible:ring-offset-2 focus-visible:ring-offset-kali-dark"
                  value={selectedPreset}
                  onChange={(event) => handlePresetChange(event.target.value)}
                  aria-labelledby="http-preset-label"
                >
                  {PRESETS.map((preset) => (
                    <option key={preset.id} value={preset.id}>
                      {preset.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid gap-4 sm:grid-cols-[minmax(120px,160px)_1fr]">
                <div className="space-y-2">
                  <label
                    id="http-method-label"
                    htmlFor="http-method"
                    className="text-xs font-semibold uppercase tracking-[0.18em] text-kali-muted"
                  >
                    Method
                  </label>
                  <select
                    id="http-method"
                    className="w-full rounded-lg border border-kali-panel-border bg-kali-overlay p-2 text-sm text-kali-text transition-colors focus:border-kali-control focus:outline-none focus-visible:ring-2 focus-visible:ring-kali-focus/80 focus-visible:ring-offset-2 focus-visible:ring-offset-kali-dark"
                    value={method}
                    onChange={(event) => {
                      markCustom();
                      setMethod(event.target.value);
                    }}
                    aria-labelledby="http-method-label"
                  >
                    <option value="GET">GET</option>
                    <option value="POST">POST</option>
                    <option value="PUT">PUT</option>
                    <option value="DELETE">DELETE</option>
                    <option value="HEAD">HEAD</option>
                    <option value="PATCH">PATCH</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label
                    id="http-url-label"
                    htmlFor="http-url"
                    className="text-xs font-semibold uppercase tracking-[0.18em] text-kali-muted"
                  >
                    URL
                  </label>
                  <input
                    id="http-url"
                    type="text"
                    className="w-full rounded-lg border border-kali-panel-border bg-kali-overlay p-2 text-sm text-kali-text transition-colors focus:border-kali-control focus:outline-none focus-visible:ring-2 focus-visible:ring-kali-focus/80 focus-visible:ring-offset-2 focus-visible:ring-offset-kali-dark"
                    value={url}
                    onChange={(event) => {
                      markCustom();
                      setUrl(event.target.value);
                    }}
                    placeholder="https://api.example.com/resource"
                    aria-labelledby="http-url-label"
                  />
                </div>
              </div>
            </div>
            <div className="rounded-xl border border-kali-panel-border bg-kali-overlay">
              <button
                type="button"
                className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left text-sm font-medium text-kali-text transition-colors hover:bg-kali-primary-surface"
                onClick={() => setHeadersOpen((prev) => !prev)}
                aria-expanded={isHeadersOpen}
                aria-controls="http-headers-section"
              >
                <div className="flex items-center gap-3">
                  <span className="inline-flex items-center rounded-full border border-kali-primary/40 bg-kali-primary-surface px-2 py-0.5 text-[0.55rem] font-semibold uppercase tracking-[0.3em] text-kali-primary">
                    Headers
                  </span>
                  <span className="text-xs text-kali-primary opacity-80">
                    {headers.length} configured row{headers.length === 1 ? '' : 's'}
                  </span>
                </div>
                <span aria-hidden="true" className="text-lg text-kali-primary">
                  {isHeadersOpen ? '−' : '+'}
                </span>
              </button>
              {isHeadersOpen && (
                <div
                  id="http-headers-section"
                  className="space-y-4 border-t border-kali-panel-border bg-kali-overlay px-4 py-5"
                >
                  {headers.map((header, index) => (
                    <div
                      key={header.id}
                      className="rounded-lg border border-kali-panel-border bg-kali-primary-surface p-4"
                    >
                      <p className="mb-3 text-xs uppercase tracking-[0.26em] text-kali-primary opacity-70">
                        Header #{index + 1}
                      </p>
                      <div className="grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
                        <div className="space-y-2">
                          <label
                            id={`header-name-${header.id}-label`}
                            htmlFor={`header-name-${header.id}`}
                            className="text-[0.65rem] font-semibold uppercase tracking-[0.18em] text-kali-muted"
                          >
                            Header name
                          </label>
                          <input
                            id={`header-name-${header.id}`}
                            type="text"
                            placeholder="Authorization"
                            className="w-full rounded-lg border border-kali-panel-border bg-kali-overlay p-2 text-sm text-kali-text transition-colors focus:border-kali-control focus:outline-none focus-visible:ring-2 focus-visible:ring-kali-focus/80 focus-visible:ring-offset-2 focus-visible:ring-offset-kali-dark"
                            value={header.name}
                            onChange={(event) =>
                              updateHeaderRow(header.id, 'name', event.target.value)
                            }
                            aria-labelledby={`header-name-${header.id}-label`}
                          />
                        </div>
                        <div className="space-y-2">
                          <label
                            id={`header-value-${header.id}-label`}
                            htmlFor={`header-value-${header.id}`}
                            className="text-[0.65rem] font-semibold uppercase tracking-[0.18em] text-kali-muted"
                          >
                            Header value
                          </label>
                          <input
                            id={`header-value-${header.id}`}
                            type="text"
                            placeholder="Bearer token"
                            className="w-full rounded-lg border border-kali-panel-border bg-kali-overlay p-2 text-sm text-kali-text transition-colors focus:border-kali-control focus:outline-none focus-visible:ring-2 focus-visible:ring-kali-focus/80 focus-visible:ring-offset-2 focus-visible:ring-offset-kali-dark"
                            value={header.value}
                            onChange={(event) =>
                              updateHeaderRow(header.id, 'value', event.target.value)
                            }
                            aria-labelledby={`header-value-${header.id}-label`}
                          />
                        </div>
                        <button
                          type="button"
                          className="h-10 rounded-lg border border-red-500/30 px-3 text-xs font-semibold uppercase tracking-[0.18em] text-red-200 transition-colors hover:bg-red-500/10"
                          onClick={() => removeHeaderRow(header.id)}
                          aria-label="Remove header"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  ))}
                  <button
                    type="button"
                    className="w-full rounded-lg border border-dashed border-kali-primary/40 px-4 py-3 text-xs font-semibold uppercase tracking-[0.24em] text-kali-primary transition-colors hover:border-kali-primary hover:bg-kali-primary-surface"
                    onClick={addHeaderRow}
                  >
                    Add header row
                  </button>
                </div>
              )}
            </div>
            <div className="rounded-xl border border-kali-panel-border bg-kali-overlay">
              <button
                type="button"
                className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left text-sm font-medium text-kali-text transition-colors hover:bg-kali-primary-surface"
                onClick={() => setBodyOpen((prev) => !prev)}
                aria-expanded={isBodyOpen}
                aria-controls="http-body-section"
              >
                <div className="flex items-center gap-3">
                  <span className="inline-flex items-center rounded-full border border-kali-primary/40 bg-kali-primary-surface px-2 py-0.5 text-[0.55rem] font-semibold uppercase tracking-[0.3em] text-kali-primary">
                    Body
                  </span>
                  <span className="text-xs text-kali-primary opacity-80">
                    {body.trim() ? 'JSON payload attached' : 'Optional payload'}
                  </span>
                </div>
                <span aria-hidden="true" className="text-lg text-kali-primary">
                  {isBodyOpen ? '−' : '+'}
                </span>
              </button>
              {isBodyOpen && (
                <div
                  id="http-body-section"
                  className="space-y-3 border-t border-kali-panel-border bg-kali-overlay px-4 py-5"
                >
                  <label
                    id="http-body-label"
                    htmlFor="http-body"
                    className="text-[0.65rem] font-semibold uppercase tracking-[0.18em] text-kali-muted"
                  >
                    Request payload
                  </label>
                  <textarea
                    id="http-body"
                    rows={6}
                    className="w-full rounded-lg border border-kali-panel-border bg-kali-overlay p-3 font-mono text-sm text-kali-text transition-colors focus:border-kali-control focus:outline-none focus-visible:ring-2 focus-visible:ring-kali-focus/80 focus-visible:ring-offset-2 focus-visible:ring-offset-kali-dark"
                    placeholder='{"example": "value"}'
                    value={body}
                    onChange={(event) => {
                      markCustom();
                      setBody(event.target.value);
                    }}
                    aria-labelledby="http-body-label"
                  />
                  <p className="text-xs text-kali-primary opacity-75">
                    Tip: keep JSON minified for quicker copy/paste. Pretty printing still works in the terminal.
                  </p>
                </div>
              )}
            </div>
          </form>
        </section>
        <section className="rounded-2xl border border-kali-panel-border bg-kali-panel shadow-kali-panel">
          <div className="flex items-center justify-between gap-3 border-b border-kali-success/25 px-6 py-4">
            <div className="flex items-center gap-3">
              <span className="inline-flex items-center rounded-full border border-kali-success/40 bg-kali-success-surface px-2 py-0.5 text-[0.6rem] font-semibold uppercase tracking-[0.28em] text-kali-success">
                Response
              </span>
              <h2 className="text-sm font-semibold text-kali-success">Preview + timeline</h2>
            </div>
            <button
              type="button"
              className="rounded-lg border border-kali-success/40 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-kali-success transition-colors hover:bg-kali-success-surface"
              onClick={copyToClipboard}
            >
              Copy command
            </button>
          </div>
          <div className="space-y-5 px-6 pb-6 pt-5">
            <p className="text-xs text-kali-success opacity-80">
              Hint: replace highlighted placeholders before running the command in a real terminal.
            </p>
            <pre
              data-testid="command-preview"
              className="max-h-80 overflow-auto rounded-xl border border-kali-success/30 bg-kali-overlay p-4 font-mono text-sm text-kali-success shadow-inner"
            >
              <code>
                {commandParts.map((part, index) => (
                  <React.Fragment key={`${part}-${index}`}>
                    {index > 0 && ' '}
                    <span
                      className={
                        part === URL_PLACEHOLDER
                          ? 'rounded-sm bg-yellow-700 px-1 text-yellow-100'
                          : undefined
                      }
                    >
                      {part}
                    </span>
                  </React.Fragment>
                ))}
              </code>
            </pre>
            <div className="space-y-3">
              <h3 className="text-xs font-semibold uppercase tracking-[0.24em] text-kali-success opacity-80">
                Response timeline
              </h3>
              <ol className="space-y-3 text-sm text-kali-text">
                {timelineSteps.map((step, index) => (
                  <li
                    key={step.id}
                    className="flex items-start gap-3 rounded-xl border border-kali-success/25 bg-kali-success-surface p-3"
                  >
                    <span className="mt-0.5 inline-flex h-6 min-w-[1.5rem] items-center justify-center rounded-full border border-kali-success/40 bg-kali-success-surface text-[0.65rem] font-semibold uppercase tracking-[0.18em] text-kali-success">
                      {index + 1}
                    </span>
                    <div>
                      <p className="text-[0.8rem] font-semibold text-kali-success">
                        {step.title}
                      </p>
                      <p className="text-[0.75rem] text-kali-success opacity-80">{step.detail}</p>
                    </div>
                  </li>
                ))}
              </ol>
            </div>
          </div>
        </section>
      </div>
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
      className="min-h-screen bg-kali-dark text-kali-text"
      initialTabs={[createTab()]}
      onNewTab={createTab}
    />
  );
};

export default HTTPPreview;
