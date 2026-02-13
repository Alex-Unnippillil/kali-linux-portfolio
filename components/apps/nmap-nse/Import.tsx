"use client";

import React, { useCallback, useId, useMemo, useRef, useState } from 'react';

export type NmapScript = {
  name: string;
  output: string;
};

export type NmapPort = {
  port: number;
  service?: string;
  protocol?: string;
  cvss?: number | null;
  scripts: NmapScript[];
};

export type NmapHost = {
  ip: string;
  hostname?: string;
  ports: NmapPort[];
};

export type ImportSummary = {
  fileName: string;
  hosts: number;
  ports: number;
  scripts: number;
  skipped: number;
  durationMs: number;
  format: 'xml' | 'gnmap';
};

export type ImportProps = {
  onBatch?: (hosts: NmapHost[]) => void;
  onComplete?: (summary: ImportSummary) => void;
  onError?: (message: string) => void;
};

type ParserContext = {
  buffer: string;
  batch: NmapHost[];
  hostCount: number;
  portCount: number;
  scriptCount: number;
  skipped: number;
};

const INITIAL_CONTEXT: ParserContext = {
  buffer: '',
  batch: [],
  hostCount: 0,
  portCount: 0,
  scriptCount: 0,
  skipped: 0
};

const YIELD_INTERVAL = 20;

const yieldToBrowser = () =>
  new Promise<void>((resolve) => {
    if (typeof window !== 'undefined') {
      const win = window as Window & {
        requestIdleCallback?: (callback: IdleRequestCallback, options?: IdleRequestOptions) => number;
      };
      if (typeof win.requestIdleCallback === 'function') {
        win.requestIdleCallback(() => resolve());
        return;
      }
    }
    setTimeout(resolve, 0);
  });

const parseXmlHost = (rawHost: string): NmapHost | null => {
  try {
    if (typeof window === 'undefined' || typeof window.DOMParser === 'undefined') {
      return null;
    }
    const doc = new window.DOMParser().parseFromString(
      `<root>${rawHost}</root>`,
      'application/xml'
    );
    const parserError = doc.querySelector('parsererror');
    if (parserError) return null;
    const hostEl = doc.querySelector('host');
    if (!hostEl) return null;
    const addressEl = hostEl.querySelector('address[addrtype="ipv4"], address');
    const ip = addressEl?.getAttribute('addr') || '';
    if (!ip) return null;
    const hostnameEl = hostEl.querySelector('hostnames > hostname');
    const hostname = hostnameEl?.getAttribute('name') || undefined;
    const ports: NmapPort[] = [];
    hostEl.querySelectorAll('ports > port').forEach((portEl) => {
      const stateEl = portEl.querySelector('state');
      const state = stateEl?.getAttribute('state');
      if (state && state !== 'open') return;
      const portId = portEl.getAttribute('portid');
      if (!portId) return;
      const portNumber = Number.parseInt(portId, 10);
      if (Number.isNaN(portNumber)) return;
      const serviceEl = portEl.querySelector('service');
      const service = serviceEl?.getAttribute('name') || undefined;
      const protocol = portEl.getAttribute('protocol') || undefined;
      const scripts: NmapScript[] = [];
      portEl.querySelectorAll('script').forEach((scriptEl) => {
        const name = scriptEl.getAttribute('id') || scriptEl.getAttribute('name');
        if (!name) return;
        const outputAttr = scriptEl.getAttribute('output');
        const output = outputAttr || scriptEl.textContent || '';
        scripts.push({
          name,
          output: output.trim()
        });
      });
      ports.push({
        port: portNumber,
        service,
        protocol,
        cvss: null,
        scripts
      });
    });
    return {
      ip,
      hostname,
      ports
    };
  } catch (error) {
    return null;
  }
};

const parseGnmapLine = (line: string): NmapHost | null => {
  if (!line.startsWith('Host:')) return null;
  try {
    const hostMatch = line.match(/^Host:\s+(\S+)/);
    if (!hostMatch) return null;
    const ip = hostMatch[1];
    const nameMatch = line.match(/\(([^)]*)\)/);
    const hostname = nameMatch && nameMatch[1] ? nameMatch[1] : undefined;
    const portsSection = line.includes('Ports:') ? line.split('Ports:')[1] : '';
    const portSegments = portsSection
      .split(',')
      .map((segment) => segment.trim())
      .filter(Boolean);
    const ports: NmapPort[] = [];
    portSegments.forEach((segment) => {
      const parts = segment.split('/');
      if (parts.length < 5) return;
      const port = Number.parseInt(parts[0], 10);
      const state = parts[1];
      const protocol = parts[2] || undefined;
      const service = parts[4] || undefined;
      if (state !== 'open' || Number.isNaN(port)) return;
      ports.push({
        port,
        protocol,
        service,
        cvss: null,
        scripts: []
      });
    });
    if (!ports.length) {
      return {
        ip,
        hostname,
        ports: []
      };
    }
    return {
      ip,
      hostname,
      ports
    };
  } catch (error) {
    return null;
  }
};

const detectFormat = (probe: string): 'xml' | 'gnmap' => {
  if (probe.trim().startsWith('<')) return 'xml';
  return 'gnmap';
};

const Import: React.FC<ImportProps> = ({ onBatch, onComplete, onError }) => {
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState<string>('Select an Nmap XML or GNMAP file to import.');
  const [summary, setSummary] = useState<ImportSummary | null>(null);
  const [isParsing, setIsParsing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const abortRef = useRef<{ cancelled: boolean; reader?: ReadableStreamDefaultReader<Uint8Array> | null }>(
    { cancelled: false, reader: null }
  );

  const resetState = useCallback(() => {
    setProgress(0);
    setStatus('Select an Nmap XML or GNMAP file to import.');
    setSummary(null);
    setIsParsing(false);
    setErrorMessage(null);
    abortRef.current = { cancelled: false, reader: null };
  }, []);

  const flushBatch = useCallback(
    async (ctx: ParserContext) => {
      if (ctx.batch.length === 0) return;
      onBatch?.(ctx.batch);
      ctx.batch = [];
      await yieldToBrowser();
    },
    [onBatch]
  );

  const parseFile = useCallback(
    async (file: File) => {
      const start = typeof performance !== 'undefined' ? performance.now() : Date.now();
      const ctx: ParserContext = { ...INITIAL_CONTEXT, buffer: '' };
      let format: 'xml' | 'gnmap' | null = null;
      let bytesRead = 0;
      try {
        setIsParsing(true);
        setStatus('Parsing file…');
        setProgress(0);
        setSummary(null);
        setErrorMessage(null);
        abortRef.current.cancelled = false;
        const reader = file.stream().getReader();
        abortRef.current.reader = reader;
        const decoder = new TextDecoder();
        while (true) {
          if (abortRef.current.cancelled) {
            await reader.cancel();
            setStatus('Import cancelled.');
            setIsParsing(false);
            return;
          }
          const { value, done } = await reader.read();
          if (done) break;
          const chunkText = decoder.decode(value, { stream: true });
          bytesRead += value.length;
          ctx.buffer += chunkText;
          if (!format) {
            format = detectFormat(ctx.buffer.slice(0, 200));
          }
          if (format === 'xml') {
            let startHost = ctx.buffer.indexOf('<host');
            while (startHost !== -1) {
              const endHost = ctx.buffer.indexOf('</host>', startHost);
              if (endHost === -1) break;
              const rawHost = ctx.buffer.slice(startHost, endHost + 7);
              ctx.buffer = ctx.buffer.slice(endHost + 7);
              const host = parseXmlHost(rawHost);
              if (!host) {
                ctx.skipped += 1;
              } else {
                ctx.batch.push(host);
                ctx.hostCount += 1;
                ctx.portCount += host.ports.length;
                host.ports.forEach((port) => {
                  ctx.scriptCount += port.scripts.length;
                });
                if (ctx.batch.length >= YIELD_INTERVAL) {
                  await flushBatch(ctx);
                }
              }
              startHost = ctx.buffer.indexOf('<host');
            }
          } else {
            let newlineIndex = ctx.buffer.indexOf('\n');
            while (newlineIndex !== -1) {
              const line = ctx.buffer.slice(0, newlineIndex).trim();
              ctx.buffer = ctx.buffer.slice(newlineIndex + 1);
              if (!line) {
                newlineIndex = ctx.buffer.indexOf('\n');
                continue;
              }
              const host = parseGnmapLine(line);
              if (!host) {
                ctx.skipped += 1;
              } else {
                ctx.batch.push(host);
                ctx.hostCount += 1;
                ctx.portCount += host.ports.length;
                host.ports.forEach((port) => {
                  ctx.scriptCount += port.scripts.length;
                });
                if (ctx.batch.length >= YIELD_INTERVAL) {
                  await flushBatch(ctx);
                }
              }
              newlineIndex = ctx.buffer.indexOf('\n');
            }
          }
          const percent = file.size ? Math.min(99, Math.round((bytesRead / file.size) * 100)) : 0;
          setProgress(percent);
        }
        const remainder = decoder.decode();
        ctx.buffer += remainder;
        if (!format) {
          format = detectFormat(ctx.buffer.slice(0, 200));
        }
        if (format === 'xml') {
          let startHost = ctx.buffer.indexOf('<host');
          while (startHost !== -1) {
            const endHost = ctx.buffer.indexOf('</host>', startHost);
            if (endHost === -1) break;
            const rawHost = ctx.buffer.slice(startHost, endHost + 7);
            ctx.buffer = ctx.buffer.slice(endHost + 7);
            const host = parseXmlHost(rawHost);
            if (!host) {
              ctx.skipped += 1;
            } else {
              ctx.batch.push(host);
              ctx.hostCount += 1;
              ctx.portCount += host.ports.length;
              host.ports.forEach((port) => {
                ctx.scriptCount += port.scripts.length;
              });
            }
            startHost = ctx.buffer.indexOf('<host');
          }
        } else {
          ctx.buffer
            .split('\n')
            .map((line) => line.trim())
            .filter(Boolean)
            .forEach((line) => {
              const host = parseGnmapLine(line);
              if (!host) {
                ctx.skipped += 1;
              } else {
                ctx.batch.push(host);
                ctx.hostCount += 1;
                ctx.portCount += host.ports.length;
                host.ports.forEach((port) => {
                  ctx.scriptCount += port.scripts.length;
                });
              }
            });
          ctx.buffer = '';
        }
        await flushBatch(ctx);
        if (format === 'xml' && ctx.buffer.trim().length > 0) {
          ctx.skipped += 1;
          ctx.buffer = '';
        }
        const endTime = typeof performance !== 'undefined' ? performance.now() : Date.now();
        const durationMs = endTime - start;
        const finalSummary: ImportSummary = {
          fileName: file.name,
          hosts: ctx.hostCount,
          ports: ctx.portCount,
          scripts: ctx.scriptCount,
          skipped: ctx.skipped,
          durationMs,
          format
        };
        setSummary(finalSummary);
        setStatus('Import completed.');
        setProgress(100);
        setIsParsing(false);
        onComplete?.(finalSummary);
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to parse file.';
        setErrorMessage(message);
        setStatus('Import failed.');
        setIsParsing(false);
        onError?.(message);
      } finally {
        abortRef.current.reader = null;
      }
    },
    [flushBatch, onComplete, onError]
  );

  const handleFileChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) return;
      resetState();
      void parseFile(file);
    },
    [parseFile, resetState]
  );

  const cancelImport = useCallback(() => {
    if (!isParsing) return;
    abortRef.current.cancelled = true;
    if (abortRef.current.reader) {
      abortRef.current.reader.cancel().catch(() => {
        /* ignore */
      });
    }
  }, [isParsing]);

  const inputId = useId();

  const summaryItems = useMemo(() => {
    if (!summary) return [];
    return [
      { label: 'Hosts processed', value: summary.hosts },
      { label: 'Open ports', value: summary.ports },
      { label: 'Script results', value: summary.scripts },
      { label: 'Skipped records', value: summary.skipped },
      { label: 'Format', value: summary.format.toUpperCase() },
      { label: 'Duration', value: `${summary.durationMs.toFixed(0)} ms` }
    ];
  }, [summary]);

  return (
    <div className="space-y-4 rounded-md border border-slate-600 bg-slate-900/60 p-4 text-sm text-slate-100">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col gap-1 text-xs uppercase tracking-wide text-slate-400">
          <label htmlFor={inputId}>Import scan results</label>
          <input
            id={inputId}
            type="file"
            accept=".xml,.gnmap,application/xml,text/plain"
            className="block cursor-pointer rounded border border-slate-500 bg-slate-800 px-3 py-2 text-sm text-slate-100"
            onChange={handleFileChange}
            disabled={isParsing}
            aria-label="Import scan results"
          />
        </div>
        <button
          type="button"
          className="self-start rounded border border-red-500 px-3 py-2 text-xs uppercase tracking-wide text-red-300 transition hover:bg-red-500/10 disabled:cursor-not-allowed disabled:opacity-50"
          onClick={cancelImport}
          disabled={!isParsing}
        >
          Cancel
        </button>
      </div>
      <div className="space-y-2">
        <div className="h-2 w-full overflow-hidden rounded bg-slate-800">
          <div
            className="h-full rounded bg-emerald-500 transition-all"
            style={{ width: `${progress}%` }}
            aria-valuenow={progress}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label="Import progress"
            role="progressbar"
          />
        </div>
        <div className="text-xs text-slate-400">{status}</div>
        {errorMessage ? (
          <div className="rounded border border-red-500 bg-red-500/10 px-3 py-2 text-red-300">
            {errorMessage}
          </div>
        ) : null}
      </div>
      {summary ? (
        <div className="rounded border border-slate-700 bg-slate-900/80 p-3">
          <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
            Import summary ({summary.fileName})
          </div>
          <dl className="grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">
            {summaryItems.map((item) => (
              <div key={item.label} className="flex items-baseline justify-between gap-2 rounded bg-slate-800/60 px-2 py-1">
                <dt className="text-xs uppercase tracking-wide text-slate-500">{item.label}</dt>
                <dd className="font-mono text-sm text-slate-100">{item.value}</dd>
              </div>
            ))}
          </dl>
        </div>
      ) : null}
    </div>
  );
};

export default Import;
