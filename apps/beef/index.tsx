'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import BeefApp from '../../components/apps/beef';

type Severity = 'Low' | 'Medium' | 'High';

interface LogEntry {
  time: string;
  severity: Severity;
  message: string;
}

type HookStage = 'disconnected' | 'initializing' | 'hooked' | 'error';

interface HookMessage {
  source: 'beef-demo';
  type: 'hook-status';
  stage?: string;
  message?: string;
}

const severityStyles: Record<Severity, { icon: string; color: string }> = {
  Low: { icon: '🟢', color: 'bg-green-700' },
  Medium: { icon: '🟡', color: 'bg-yellow-700' },
  High: { icon: '🔴', color: 'bg-red-700' },
};

const statusLabels: Record<HookStage, string> = {
  disconnected: 'Disconnected',
  initializing: 'Initializing',
  hooked: 'Hooked',
  error: 'Error',
};

const statusColors: Record<HookStage, string> = {
  disconnected: 'text-red-400',
  initializing: 'text-yellow-300',
  hooked: 'text-green-400',
  error: 'text-orange-400',
};

const defaultMessages: Record<string, string> = {
  loading: 'Sandboxed page loaded in isolated environment.',
  ready: 'Sandbox handshake acknowledged. Deploying local hook.',
  probe: 'Local recon telemetry received.',
  hooked: 'Simulated BeEF hook established locally.',
  disconnected: 'Sandbox target closed the connection.',
  error: 'Sandbox reported an error state.',
};

const severityByStage: Record<string, Severity> = {
  loading: 'Low',
  ready: 'Medium',
  probe: 'Medium',
  hooked: 'High',
  disconnected: 'Low',
  error: 'High',
};

const isHookMessage = (data: unknown): data is HookMessage => {
  if (!data || typeof data !== 'object') {
    return false;
  }

  const payload = data as Record<string, unknown>;
  return payload.source === 'beef-demo' && payload.type === 'hook-status';
};

const timeStamp = () => new Date().toLocaleTimeString('en-GB', { hour12: false });

const BeefPage: React.FC = () => {
  const [logs, setLogs] = useState<LogEntry[]>([
    { time: '10:00:00', severity: 'Low', message: 'Hook initialized' },
    { time: '10:00:02', severity: 'Medium', message: 'Payload delivered' },
    { time: '10:00:03', severity: 'High', message: 'Sensitive data exfil attempt' },
  ]);
  const [hookStage, setHookStage] = useState<HookStage>('disconnected');
  const [statusDetail, setStatusDetail] = useState<string>(
    'No target connected. Launch the sandbox to begin.'
  );
  const [frameActive, setFrameActive] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement | null>(null);

  const addLog = useCallback((message: string, severity: Severity) => {
    setLogs((prev) => [...prev, { time: timeStamp(), severity, message }]);
  }, []);

  const handleConnect = useCallback(() => {
    if (frameActive) {
      return;
    }
    setFrameActive(true);
    setHookStage('initializing');
    setStatusDetail('Launching sandboxed target iframe...');
    addLog('Launching sandboxed target iframe.', 'Low');
  }, [addLog, frameActive]);

  const handleDisconnect = useCallback(() => {
    if (!frameActive) {
      return;
    }
    setFrameActive(false);
    setHookStage('disconnected');
    setStatusDetail('Sandbox target removed. Ready to reconnect.');
    addLog('Disconnected from sandbox target.', 'Low');
    iframeRef.current = null;
  }, [addLog, frameActive]);

  const handleSandboxLoad = useCallback(() => {
    setStatusDetail('Sandbox target loaded. Waiting for hook signal.');
    addLog('Sandboxed target loaded locally.', 'Low');
    iframeRef.current?.contentWindow?.postMessage(
      { source: 'beef-console', type: 'beef-demo:init' },
      '*'
    );
  }, [addLog]);

  useEffect(() => {
    if (!frameActive) {
      return undefined;
    }

    const handleMessage = (event: MessageEvent) => {
      if (!isHookMessage(event.data)) {
        return;
      }

      const stage = typeof event.data.stage === 'string' ? event.data.stage : undefined;
      const incoming =
        typeof event.data.message === 'string'
          ? event.data.message
          : undefined;
      const detail = incoming ?? (stage ? defaultMessages[stage] : undefined) ?? 'Sandbox update received.';
      const severity = (stage && severityByStage[stage]) || 'Low';

      if (stage === 'hooked') {
        setHookStage('hooked');
      } else if (stage === 'error') {
        setHookStage('error');
      } else if (stage === 'disconnected') {
        setHookStage('disconnected');
        setFrameActive(false);
        iframeRef.current = null;
      } else if (stage) {
        setHookStage('initializing');
      }

      setStatusDetail(detail);
      addLog(detail, severity);
    };

    window.addEventListener('message', handleMessage);
    return () => {
      window.removeEventListener('message', handleMessage);
    };
  }, [frameActive, addLog]);

  const statusColor = statusColors[hookStage];
  const statusLabel = statusLabels[hookStage];

  return (
    <div className="bg-ub-cool-grey text-white h-full w-full flex flex-col">
      <header className="flex items-center justify-between p-4">
        <div className="flex items-center gap-2">
          <Image
            src="/themes/Yaru/apps/beef.svg"
            alt="BeEF badge"
            width={48}
            height={48}
          />
          <h1 className="text-xl">BeEF Demo</h1>
        </div>
        <div className="flex gap-2">
          <img
            src="/themes/Yaru/window/window-minimize-symbolic.svg"
            alt="minimize"
            className="w-6 h-6"
          />
          <img
            src="/themes/Yaru/window/window-close-symbolic.svg"
            alt="close"
            className="w-6 h-6"
          />
        </div>
      </header>

      <div className="p-4 flex-1 overflow-auto">
        <div className="grid gap-6 lg:grid-cols-2">
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Hook Lab</h2>
              <span
                data-testid="hook-status"
                className={`text-sm font-semibold ${statusColor}`}
              >
                {statusLabel}
              </span>
            </div>
            <p data-testid="hook-status-message" className="text-sm text-gray-300">
              {statusDetail}
            </p>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={handleConnect}
                disabled={frameActive}
                className="px-3 py-1 rounded bg-ub-primary text-white disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Launch Sandbox
              </button>
              <button
                type="button"
                onClick={handleDisconnect}
                disabled={!frameActive}
                className="px-3 py-1 rounded bg-ub-orange text-black disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Disconnect
              </button>
            </div>
            <div className="border border-gray-700 rounded bg-black/30 h-64 flex items-center justify-center">
              {frameActive ? (
                <iframe
                  ref={iframeRef}
                  title="BeEF sandbox target"
                  src="/beef-demo/index.html"
                  sandbox="allow-scripts"
                  className="w-full h-full rounded"
                  onLoad={handleSandboxLoad}
                />
              ) : (
                <p className="text-sm text-gray-400 text-center px-4">
                  The sandboxed target loads entirely from local files. Launch it to
                  simulate a BeEF hook without any external traffic.
                </p>
              )}
            </div>
          </section>
          <section className="min-h-[16rem]">
            <div className="border border-gray-700 rounded bg-black/20 h-full overflow-hidden">
              <BeefApp />
            </div>
          </section>
        </div>
      </div>

      <div className="border-t border-gray-700 font-mono text-sm" data-testid="hook-log">
        {logs.map((log, idx) => (
          <div key={idx} className="flex items-center gap-2 px-2 py-1.5">
            <span
              className={`flex items-center px-2 py-0.5 rounded-full text-xs ${severityStyles[log.severity].color}`}
            >
              <span className="mr-1">{severityStyles[log.severity].icon}</span>
              {log.severity}
            </span>
            <span className="text-gray-400">{log.time}</span>
            <span>{log.message}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default BeefPage;
