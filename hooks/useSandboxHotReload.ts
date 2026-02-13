"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

type SandboxKind = 'worker' | 'iframe';

type LogLevel = 'log' | 'warn' | 'error';

export interface SandboxLogEntry {
  id: string;
  level: LogLevel;
  message: string;
  timestamp: number;
}

interface ExtensionManifest {
  id?: string;
  sandbox?: SandboxKind;
  code?: string;
  entry?: string;
}

interface UseSandboxHotReloadOptions {
  manifestUrl: string | null;
  enabled: boolean;
  pollInterval?: number;
}

interface UseSandboxHotReloadResult {
  status: 'idle' | 'loading' | 'running' | 'error';
  sandboxType: SandboxKind | null;
  logs: SandboxLogEntry[];
  frameUrl: string | null;
  error: string | null;
  manualReload: () => void;
  clearLogs: () => void;
}

const serialize = (value: unknown): string => {
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }
  if (value === undefined || value === null) {
    return String(value);
  }
  try {
    return JSON.stringify(value);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'error';
    return `[unserializable: ${message}]`;
  }
};

const serializerSource = `const __sandboxSerialize = (value) => {
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (value === undefined || value === null) return String(value);
  try {
    return JSON.stringify(value);
  } catch (err) {
    const message = err && err.message ? err.message : 'error';
    return '[unserializable: ' + message + ']';
  }
};
`;

const clampInterval = (interval?: number) => {
  if (!interval || Number.isNaN(interval)) return 1000;
  return Math.max(250, interval);
};

const isExtensionManifest = (value: unknown): value is ExtensionManifest => {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as ExtensionManifest;
  const hasCode = typeof candidate.code === 'string';
  const hasEntry = typeof candidate.entry === 'string';
  return hasCode || hasEntry;
};

const buildWorkerBundle = (code: string, token: string) => `${serializerSource}
const __sandboxSend = (type, args) => {
  try {
    const message = Array.from(args).map(__sandboxSerialize).join(' ');
    self.postMessage({ __sandbox: true, __sandboxToken: '${token}', type, message });
  } catch (err) {
    self.postMessage({ __sandbox: true, __sandboxToken: '${token}', type: 'error', message: String(err) });
  }
};
self.console = {
  log: (...args) => __sandboxSend('log', args),
  warn: (...args) => __sandboxSend('warn', args),
  error: (...args) => __sandboxSend('error', args),
};
self.addEventListener('error', (event) => {
  __sandboxSend('error', [event.message || 'Worker error']);
});
(async () => {
  try {
    ${code}
  } catch (err) {
    __sandboxSend('error', [err && err.stack ? err.stack : String(err)]);
  }
})();
`;

const buildIframeBundle = (code: string, token: string) => `<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'unsafe-inline'; connect-src 'self';" />
    <title>Sandbox</title>
    <style>
      html, body { margin: 0; padding: 0; background: transparent; color: #f8fafc; font-family: ui-monospace, SFMono-Regular, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace; }
    </style>
  </head>
  <body>
    <script>
      ${serializerSource}
      const send = (type, args) => {
        const message = Array.from(args).map(__sandboxSerialize).join(' ');
        parent.postMessage({ __sandbox: true, __sandboxToken: '${token}', type, message }, '*');
      };
      console.log = (...args) => send('log', args);
      console.warn = (...args) => send('warn', args);
      console.error = (...args) => send('error', args);
      window.addEventListener('error', (event) => {
        send('error', [event.message + ' @ ' + event.filename + ':' + event.lineno]);
      });
      try {
        ${code}
      } catch (err) {
        send('error', [err && err.stack ? err.stack : String(err)]);
      }
    </script>
  </body>
</html>`;

export function useSandboxHotReload({
  manifestUrl,
  enabled,
  pollInterval,
}: UseSandboxHotReloadOptions): UseSandboxHotReloadResult {
  const [status, setStatus] = useState<'idle' | 'loading' | 'running' | 'error'>(
    enabled ? 'loading' : 'idle',
  );
  const [sandboxType, setSandboxType] = useState<SandboxKind | null>(null);
  const [logs, setLogs] = useState<SandboxLogEntry[]>([]);
  const [frameUrl, setFrameUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const workerRef = useRef<{ instance: Worker | null; url: string | null }>({
    instance: null,
    url: null,
  });
  const iframeUrlRef = useRef<string | null>(null);
  const pollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSignatureRef = useRef<string | null>(null);
  const hasLoadedOnceRef = useRef(false);
  const tokenRef = useRef<string | null>(null);

  const pushLog = useCallback((level: LogLevel, message: string) => {
    setLogs((prev) => {
      const entry: SandboxLogEntry = {
        id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
        level,
        message,
        timestamp: Date.now(),
      };
      const next = [...prev, entry];
      if (next.length > 200) {
        next.shift();
      }
      return next;
    });
  }, []);

  const handleSandboxMessage = useCallback(
    (payload: any) => {
      if (!payload || typeof payload !== 'object') return;
      const token = (payload as { __sandboxToken?: string }).__sandboxToken;
      if (!token || token !== tokenRef.current) return;
      const type = (payload as { type?: string }).type;
      const message = (payload as { message?: string }).message;
      if (typeof message !== 'string') return;
      const normalized: LogLevel = type === 'error' ? 'error' : type === 'warn' ? 'warn' : 'log';
      pushLog(normalized, message);
      if (normalized === 'error') {
        setError(message);
      }
    },
    [pushLog],
  );

  useEffect(() => {
    if (typeof window === 'undefined') return () => undefined;
    const listener = (event: MessageEvent) => {
      handleSandboxMessage(event.data);
    };
    window.addEventListener('message', listener);
    return () => {
      window.removeEventListener('message', listener);
    };
  }, [handleSandboxMessage]);

  const cleanupSandbox = useCallback(() => {
    if (workerRef.current.instance) {
      workerRef.current.instance.terminate();
    }
    if (workerRef.current.url) {
      URL.revokeObjectURL(workerRef.current.url);
    }
    workerRef.current = { instance: null, url: null };

    if (iframeUrlRef.current) {
      URL.revokeObjectURL(iframeUrlRef.current);
      iframeUrlRef.current = null;
    }
    setFrameUrl(null);
  }, []);

  const runSandbox = useCallback(
    (manifest: Required<Pick<ExtensionManifest, 'code'>> & ExtensionManifest) => {
      cleanupSandbox();
      const token = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
      tokenRef.current = token;

      const resolvedSandbox: SandboxKind =
        manifest.sandbox === 'iframe' ? 'iframe' : 'worker';
      setSandboxType(resolvedSandbox);
      setStatus('running');
      setError(null);
      pushLog('log', `Reloaded ${manifest.id ?? 'extension'} (${resolvedSandbox})`);

      if (resolvedSandbox === 'worker') {
        const blob = new Blob([buildWorkerBundle(manifest.code, token)], {
          type: 'text/javascript',
        });
        const url = URL.createObjectURL(blob);
        try {
          const worker = new Worker(url);
          workerRef.current = { instance: worker, url };
          worker.onmessage = (event) => {
            handleSandboxMessage(event.data);
          };
          worker.onerror = (event) => {
            const message = event.message || 'Worker execution error';
            pushLog('error', message);
            setError(message);
          };
        } catch (err) {
          URL.revokeObjectURL(url);
          workerRef.current = { instance: null, url: null };
          const message = err instanceof Error ? err.message : 'Failed to start worker';
          pushLog('error', message);
          setError(message);
          setStatus('error');
        }
      } else {
        const blob = new Blob([buildIframeBundle(manifest.code, token)], {
          type: 'text/html',
        });
        const url = URL.createObjectURL(blob);
        iframeUrlRef.current = url;
        setFrameUrl(url);
      }
    },
    [cleanupSandbox, handleSandboxMessage, pushLog],
  );

  const resolveEntryCode = useCallback(
    async (manifest: ExtensionManifest) => {
      if (manifest.code && typeof manifest.code === 'string') {
        return manifest.code;
      }
      if (!manifest.entry || typeof manifest.entry !== 'string') {
        throw new Error('Manifest is missing "code" or "entry"');
      }
      if (!manifestUrl) {
        throw new Error('Cannot resolve manifest entry without URL context');
      }
      let entryUrl: string;
      try {
        entryUrl = new URL(manifest.entry, manifestUrl).toString();
      } catch {
        throw new Error('Invalid entry path in manifest');
      }
      const response = await fetch(
        `${entryUrl}${entryUrl.includes('?') ? '&' : '?'}_ts=${Date.now()}`,
        {
          cache: 'no-store',
        },
      );
      if (!response.ok) {
        throw new Error(`Failed to fetch entry (${response.status})`);
      }
      return response.text();
    },
    [manifestUrl],
  );

  const loadManifest = useCallback(
    async (force = false) => {
      if (!enabled || !manifestUrl || typeof window === 'undefined') {
        return;
      }
      setStatus((prev) => (prev === 'idle' ? 'loading' : prev));
      try {
        const response = await fetch(
          `${manifestUrl}${manifestUrl.includes('?') ? '&' : '?'}_ts=${Date.now()}`,
          {
            cache: 'no-store',
          },
        );
        if (!response.ok) {
          throw new Error(`Failed to fetch manifest (${response.status})`);
        }
        const data = await response.json();
        if (!isExtensionManifest(data)) {
          throw new Error('Invalid manifest structure');
        }
        const signature = JSON.stringify({
          sandbox: data.sandbox ?? 'worker',
          code: data.code ?? null,
          entry: data.entry ?? null,
        });
        if (!force && signature === lastSignatureRef.current) {
          return;
        }
        lastSignatureRef.current = signature;
        const code = await resolveEntryCode(data);
        runSandbox({ ...data, code });
        setStatus('running');
        setError(null);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown manifest error';
        pushLog('error', message);
        setError(message);
        setStatus('error');
      } finally {
        hasLoadedOnceRef.current = true;
      }
    },
    [enabled, manifestUrl, pushLog, resolveEntryCode, runSandbox],
  );

  useEffect(() => {
    if (!enabled || !manifestUrl || typeof window === 'undefined') {
      cleanupSandbox();
      setStatus('idle');
      setSandboxType(null);
      if (pollTimerRef.current) {
        clearTimeout(pollTimerRef.current);
        pollTimerRef.current = null;
      }
      lastSignatureRef.current = null;
      tokenRef.current = null;
      return;
    }

    let cancelled = false;
    const interval = clampInterval(pollInterval);

    const poll = async () => {
      if (cancelled) return;
      await loadManifest(!hasLoadedOnceRef.current);
      if (cancelled) return;
      pollTimerRef.current = setTimeout(poll, interval);
    };

    poll();

    return () => {
      cancelled = true;
      if (pollTimerRef.current) {
        clearTimeout(pollTimerRef.current);
        pollTimerRef.current = null;
      }
      cleanupSandbox();
    };
  }, [cleanupSandbox, enabled, loadManifest, manifestUrl, pollInterval]);

  const manualReload = useCallback(() => {
    lastSignatureRef.current = null;
    loadManifest(true);
  }, [loadManifest]);

  const clearLogs = useCallback(() => {
    setLogs([]);
    setError(null);
  }, []);

  return useMemo(
    () => ({
      status,
      sandboxType,
      logs,
      frameUrl,
      error,
      manualReload,
      clearLogs,
    }),
    [clearLogs, error, frameUrl, logs, manualReload, sandboxType, status],
  );
}
