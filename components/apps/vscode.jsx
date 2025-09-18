'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import apps from '../../apps.config';

const ALLOWED_ORIGINS = ['https://stackblitz.com', 'https://vscode.dev'];
export const HEARTBEAT_TIMEOUT_MS = 10000;

// Load the actual VSCode app lazily so no editor dependencies are required
const LazyVsCode = dynamic(() => import('../../apps/vscode'), { ssr: false });

// Simple fuzzy match: returns true if query characters appear in order
function fuzzyMatch(text, query) {
  const t = text.toLowerCase();
  const q = query.toLowerCase();
  let ti = 0;
  let qi = 0;
  while (ti < t.length && qi < q.length) {
    if (t[ti] === q[qi]) qi++;
    ti++;
  }
  return qi === q.length;
}

const files = ['README.md', 'CHANGELOG.md', 'package.json'];

const createNonce = () => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
};

export function VsCodeMessagingWrapper({ openApp, frameRef: externalFrameRef, VsCodeComponent = LazyVsCode }) {
  const [visible, setVisible] = useState(false);
  const [query, setQuery] = useState('');
  const [crashed, setCrashed] = useState(false);

  const internalFrameRef = useRef(null);
  const frameControllerRef = useMemo(() => externalFrameRef ?? internalFrameRef, [externalFrameRef]);
  const nonceRef = useRef('');
  const heartbeatRef = useRef(null);
  const handshakeOriginRef = useRef(null);
  const handshakeCompleteRef = useRef(false);

  if (!nonceRef.current) {
    nonceRef.current = createNonce();
  }

  const nonce = nonceRef.current;

  const items = useMemo(() => {
    const list = [
      ...apps.map((a) => ({ type: 'app', id: a.id, title: a.title })),
      ...files.map((f) => ({ type: 'file', id: f, title: f })),
    ];
    if (!query) return list;
    return list.filter((item) => fuzzyMatch(item.title, query));
  }, [query]);

  useEffect(() => {
    const handler = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'p') {
        e.preventDefault();
        setVisible((v) => !v);
      } else if (e.key === 'Escape') {
        setVisible(false);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  const clearHeartbeat = useCallback(() => {
    if (heartbeatRef.current) {
      clearTimeout(heartbeatRef.current);
      heartbeatRef.current = null;
    }
  }, []);

  useEffect(() => () => clearHeartbeat(), [clearHeartbeat]);

  const handleCrash = useCallback(() => {
    clearHeartbeat();
    handshakeCompleteRef.current = false;
    handshakeOriginRef.current = null;
    setCrashed(true);
    const controller = frameControllerRef.current;
    controller?.reload?.();
  }, [clearHeartbeat, frameControllerRef]);

  const scheduleHeartbeat = useCallback(() => {
    if (!handshakeCompleteRef.current || typeof window === 'undefined') return;
    clearHeartbeat();
    heartbeatRef.current = window.setTimeout(() => {
      handleCrash();
    }, HEARTBEAT_TIMEOUT_MS);
  }, [clearHeartbeat, handleCrash]);

  const sendAck = useCallback(
    (origin) => {
      const controller = frameControllerRef.current;
      if (!controller?.postMessage) return;
      if (!ALLOWED_ORIGINS.includes(origin)) return;
      controller.postMessage({ type: 'vscode:ack' }, origin);
    },
    [frameControllerRef],
  );

  const sendHandshake = useCallback(() => {
    const controller = frameControllerRef.current;
    if (!controller?.postMessage) return;
    ALLOWED_ORIGINS.forEach((origin) => {
      controller.postMessage({ type: 'vscode:init-request' }, origin);
    });
  }, [frameControllerRef]);

  const handleFrameLoad = useCallback(() => {
    setCrashed(false);
    handshakeCompleteRef.current = false;
    handshakeOriginRef.current = null;
    clearHeartbeat();
    sendHandshake();
  }, [clearHeartbeat, sendHandshake]);

  const handleFrameMessage = useCallback(
    (payload, event) => {
      if (!payload || typeof payload !== 'object') return;
      if (payload.nonce !== nonce) return;
      if (!ALLOWED_ORIGINS.includes(event.origin)) return;
      if (handshakeOriginRef.current && handshakeOriginRef.current !== event.origin) return;

      if (payload.type === 'vscode:init') {
        handshakeCompleteRef.current = true;
        handshakeOriginRef.current = event.origin;
        setCrashed(false);
        scheduleHeartbeat();
        sendAck(event.origin);
      } else if (payload.type === 'vscode:ping') {
        if (!handshakeCompleteRef.current) return;
        scheduleHeartbeat();
      }
    },
    [nonce, scheduleHeartbeat, sendAck],
  );

  const messagingConfig = useMemo(
    () => ({
      allowedOrigins: ALLOWED_ORIGINS,
      nonce,
      onMessage: handleFrameMessage,
    }),
    [nonce, handleFrameMessage],
  );

  const selectItem = useCallback(
    (item) => {
      setVisible(false);
      setQuery('');
      if (item.type === 'app' && openApp) {
        openApp(item.id);
      } else if (item.type === 'file') {
        window.open(item.id, '_blank');
      }
    },
    [openApp],
  );

  return (
    <div className="relative h-full w-full">
      <VsCodeComponent frameRef={frameControllerRef} messaging={messagingConfig} onFrameLoad={handleFrameLoad} />
      {crashed && (
        <div
          data-testid="vscode-crash-overlay"
          className="absolute inset-0 z-40 flex flex-col items-center justify-center bg-black/70 px-4 text-center text-white"
        >
          <p className="text-sm font-medium md:text-base">VS Code preview disconnected. Reloading…</p>
        </div>
      )}
      {visible && (
        <div className="absolute inset-0 z-30 flex items-start justify-center bg-black/50 pt-24">
          <div className="w-11/12 max-w-md rounded bg-gray-800 p-2 text-white shadow-lg">
            <input
              autoFocus
              className="mb-2 w-full rounded bg-gray-700 p-2 outline-none"
              placeholder="Search apps or files"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            <ul className="max-h-60 overflow-y-auto">
              {items.map((item) => (
                <li key={`${item.type}-${item.id}`}>
                  <button
                    onClick={() => selectItem(item)}
                    className="w-full rounded px-2 py-1 text-left hover:bg-gray-700"
                  >
                    {item.title}
                  </button>
                </li>
              ))}
              {items.length === 0 && <li className="px-2 py-1 text-sm text-gray-400">No results</li>}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}

export default function VsCodeWrapper(props) {
  return <VsCodeMessagingWrapper {...props} />;
}

export const displayVsCode = (openApp) => <VsCodeWrapper openApp={openApp} />;
