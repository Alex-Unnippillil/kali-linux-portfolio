'use client';

import Image from 'next/image';
import { useEffect, useRef, useState, type ReactEventHandler } from 'react';
import ExternalFrame from '../../components/ExternalFrame';
import { CloseIcon, MaximizeIcon, MinimizeIcon } from '../../components/ToolbarIcons';
import { kaliTheme } from '../../styles/themes/kali';
import { SIDEBAR_WIDTH, ICON_SIZE } from './utils';

const STACKBLITZ_ORIGIN = 'https://stackblitz.com';
const STACKBLITZ_EMBED_URL =
  'https://stackblitz.com/github/Alex-Unnippillil/kali-linux-portfolio?embed=1&file=README.md';
export const STACKBLITZ_HANDSHAKE_TIMEOUT_MS = 12000;

const EDITOR_TABS = [
  { label: 'README.md', isActive: true },
  { label: 'apps/vscode/index.tsx', isActive: false },
  { label: 'package.json', isActive: false },
];

type EmbedStatus = 'loading' | 'ready' | 'error' | 'timeout';

type StackBlitzPayload = {
  type?: string;
  status?: string;
  reason?: string;
};

const READY_KEYWORDS = ['ready', 'frame-ready', 'workspace-ready'];
const DENIED_KEYWORDS = ['denied', 'blocked', 'forbidden'];

function normalizePayload(data: unknown): StackBlitzPayload {
  if (typeof data === 'string') {
    try {
      return normalizePayload(JSON.parse(data));
    } catch {
      return { type: data };
    }
  }

  if (data && typeof data === 'object') {
    const record = data as Record<string, unknown>;
    const keys = ['type', 'event', 'action', 'cmd', 'kind'];
    for (const key of keys) {
      const value = record[key];
      if (typeof value === 'string') {
        return {
          type: value,
          status: typeof record.status === 'string' ? record.status : undefined,
          reason:
            typeof record.reason === 'string'
              ? record.reason
              : typeof record.error === 'string'
                ? record.error
                : typeof record.message === 'string'
                  ? record.message
                  : undefined,
        };
      }
    }

    return {
      status: typeof record.status === 'string' ? record.status : undefined,
      reason:
        typeof record.reason === 'string'
          ? record.reason
          : typeof record.error === 'string'
            ? record.error
            : typeof record.message === 'string'
              ? record.message
              : undefined,
    };
  }

  return {};
}

const getStatusMessage = (status: EmbedStatus, errorMessage: string | null): string => {
  switch (status) {
    case 'ready':
      return '';
    case 'error':
      return errorMessage ?? 'StackBlitz denied the embed request.';
    case 'timeout':
      return 'StackBlitz is taking longer than expected. You can open the project in a new tab.';
    default:
      return 'Connecting to the StackBlitz workspace…';
  }
};

export default function VsCode() {
  const frameRef = useRef<HTMLIFrameElement | null>(null);
  const [status, setStatus] = useState<EmbedStatus>('loading');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const statusRef = useRef<EmbedStatus>('loading');

  useEffect(() => {
    statusRef.current = status;
  }, [status]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return undefined;
    }

    const handleMessage = (event: MessageEvent) => {
      if (!event.origin.startsWith(STACKBLITZ_ORIGIN)) {
        return;
      }

      const targetWindow = frameRef.current?.contentWindow;
      if (targetWindow && event.source && event.source !== targetWindow) {
        return;
      }

      const payload = normalizePayload(event.data);
      const type = payload.type?.toLowerCase();
      const payloadStatus = payload.status?.toLowerCase();

      if (type) {
        if (READY_KEYWORDS.some((keyword) => type.includes(keyword))) {
          setStatus('ready');
          setErrorMessage(null);
          return;
        }

        if (
          statusRef.current !== 'ready' &&
          (DENIED_KEYWORDS.some((keyword) => type.includes(keyword)) || type.includes('error'))
        ) {
          setStatus('error');
          setErrorMessage(payload.reason ?? 'StackBlitz denied the embed request.');
          return;
        }
      }

      if (payloadStatus) {
        if (READY_KEYWORDS.some((keyword) => payloadStatus.includes(keyword))) {
          setStatus('ready');
          setErrorMessage(null);
          return;
        }

        if (
          statusRef.current !== 'ready' &&
          DENIED_KEYWORDS.some((keyword) => payloadStatus.includes(keyword))
        ) {
          setStatus('error');
          setErrorMessage(payload.reason ?? 'StackBlitz denied the embed request.');
        }
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return undefined;
    }

    if (status !== 'loading') {
      return undefined;
    }

    const timeoutId = window.setTimeout(() => {
      setStatus((current) => (current === 'ready' ? current : 'timeout'));
    }, STACKBLITZ_HANDSHAKE_TIMEOUT_MS);

    return () => window.clearTimeout(timeoutId);
  }, [status]);

  const showOverlay = status !== 'ready';
  const statusMessage = getStatusMessage(status, errorMessage);

  const handleFrameError: ReactEventHandler<HTMLIFrameElement> = () => {
    if (statusRef.current === 'ready') {
      return;
    }
    setStatus('error');
    setErrorMessage('Unable to reach StackBlitz from this browser.');
  };

  return (
    <div
      className="flex flex-col min-[1366px]:flex-row h-full w-full max-w-full"
      style={{ backgroundColor: kaliTheme.background, color: kaliTheme.text }}
    >
      <aside
        className="flex flex-col items-center gap-3 px-2 py-4 border-r border-[color:var(--kali-panel-border)] bg-[var(--kali-panel)]"
        style={{ width: SIDEBAR_WIDTH, backgroundColor: 'var(--kali-panel)' }}
      >
        <div
          className="rounded-md bg-[color:var(--color-primary)] opacity-80 shadow-inner shadow-black/40 transition-opacity hover:opacity-100"
          style={{ width: ICON_SIZE, height: ICON_SIZE }}
        />
        <div
          className="rounded-md bg-[color:var(--color-primary)] opacity-80 shadow-inner shadow-black/40 transition-opacity hover:opacity-100"
          style={{ width: ICON_SIZE, height: ICON_SIZE }}
        />
      </aside>
      <div className="flex-1 flex flex-col border border-[color:var(--kali-panel-border)] bg-[var(--kali-panel)] rounded-md overflow-hidden">
        <div
          className="flex items-center justify-end gap-2 px-3 py-2 border-b border-[color:var(--kali-panel-border)] bg-[var(--kali-panel)]"
        >
          <button aria-label="Minimize">
            <MinimizeIcon />
          </button>
          <button aria-label="Maximize">
            <MaximizeIcon />
          </button>
          <button aria-label="Close">
            <CloseIcon />
          </button>
        </div>
        <nav className="flex items-center gap-1 border-b border-[color:var(--kali-panel-border)] bg-[var(--kali-panel-highlight)] px-2 py-1">
          {EDITOR_TABS.map(({ label, isActive }) => (
            <button
              key={label}
              type="button"
              aria-current={isActive ? 'page' : undefined}
              className={`flex items-center gap-2 rounded-t-md px-3 py-2 text-xs font-medium tracking-tight transition-colors ${
                isActive
                  ? 'border border-b-0 border-[color:var(--kali-panel-border)] bg-[var(--kali-panel)] text-[color:var(--color-text)] shadow-[inset_0_-1px_0_var(--kali-panel-border)]'
                  : 'text-[color:var(--color-text)] opacity-70 hover:opacity-100 hover:bg-[var(--kali-panel-highlight)]'
              }`}
            >
              <span
                className="inline-flex h-2 w-2 rounded-full"
                style={{
                  backgroundColor: isActive ? 'var(--kali-terminal-green)' : 'var(--kali-panel-border)',
                  boxShadow: isActive ? '0 0 6px var(--kali-terminal-green)' : undefined,
                }}
              />
              {label}
            </button>
          ))}
          <span className="ml-auto px-2 py-1 text-[11px] uppercase tracking-wide text-[color:var(--color-text)] opacity-60">
            Spaces: 2
          </span>
        </nav>
        <div className="relative flex-1" style={{ backgroundColor: kaliTheme.background }}>
          <ExternalFrame
            ref={frameRef}
            src={STACKBLITZ_EMBED_URL}
            title="VsCode"
            className="w-full h-full"
            onError={handleFrameError}
          />
          {showOverlay && (
            <div className="absolute inset-0 flex items-center justify-center bg-[color:var(--color-overlay-strong)] px-6 text-center">
              <div
                className="flex flex-col items-center gap-3 text-[color:var(--color-text)]"
                role={status === 'error' || status === 'timeout' ? 'alert' : 'status'}
                aria-live="polite"
              >
                <span className="text-sm md:text-base">{statusMessage}</span>
                {(status === 'error' || status === 'timeout') && (
                  <a
                    href={STACKBLITZ_EMBED_URL.replace('embed=1&', '')}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded border border-[color:var(--kali-panel-border)] bg-[var(--kali-panel-highlight)] px-3 py-1 text-sm font-medium text-[color:var(--color-text)] transition-colors hover:bg-[var(--kali-panel)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--color-primary)]"
                  >
                    Open in StackBlitz
                  </a>
                )}
              </div>
            </div>
          )}
          <div
            className="absolute top-4 left-4 flex items-center gap-4 rounded border border-[color:var(--kali-panel-border)] bg-[var(--kali-panel)] p-4 shadow-kali-panel"
            style={{ backgroundColor: 'color-mix(in srgb, var(--kali-panel) 88%, transparent)' }}
          >
            <Image
              src="/themes/Yaru/system/view-app-grid-symbolic.svg"
              alt="Open Folder"
              width={64}
              height={64}
            />
            <span className="text-lg">Open Folder</span>
          </div>
        </div>
        <div
          className="flex items-center gap-3 px-3 py-2 border-t border-[color:var(--kali-panel-border)] bg-[var(--kali-panel)] text-[color:var(--color-text)] opacity-80"
        >
          <span className="flex items-center gap-1 rounded-full border border-[color:var(--kali-panel-border)] bg-[var(--kali-panel-highlight)] px-2 py-1 text-[12px] uppercase text-[color:var(--color-text)]">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="w-3 h-3"
            >
              <line x1="6" y1="3" x2="6" y2="15" />
              <circle cx="18" cy="6" r="3" />
              <circle cx="6" cy="18" r="3" />
              <path d="M18 9a9 9 0 0 1-9 9" />
            </svg>
            MAIN
          </span>
          <span className="flex items-center gap-1 rounded-full border border-[color:var(--kali-panel-border)] bg-[var(--kali-panel-highlight)] px-2 py-1 text-[12px] uppercase text-[color:var(--color-text)]">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="w-3 h-3"
            >
              <polyline points="20 6 9 17 4 12" />
            </svg>
            CHECKS
          </span>
        </div>
      </div>
    </div>
  );
}
