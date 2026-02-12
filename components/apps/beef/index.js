import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import PayloadBuilder from '../../../apps/beef/components/PayloadBuilder';

const SANDBOX_DOCUMENT = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8"/>
  <title>Sandboxed Target</title>
</head>
<body>
  <h1>Sandboxed Target Page</h1>
  <p>This page is isolated and cannot make network requests.</p>
  <script>
    window.parent.postMessage({ source: 'sandboxed-target', type: 'sandbox-ready' }, '*');
    window.addEventListener('message', function (event) {
      if (!event || !event.data) {
        return;
      }
      if (event.data.type === 'ping') {
        window.parent.postMessage({ source: 'sandboxed-target', type: 'pong' }, '*');
      }
    });
  </script>
</body>
</html>
`;

const CONNECTION_STATE_COPY = {
  disconnected: 'Disconnected',
  connecting: 'Connecting…',
  connected: 'Connected',
};

export default function Beef() {
  const [step, setStep] = useState(0);
  const [connectionState, setConnectionState] = useState('disconnected');
  const [sandboxInstance, setSandboxInstance] = useState(0);
  const listenerRef = useRef();
  const handshakeTimeoutRef = useRef();

  const connect = useCallback(() => {
    if (connectionState !== 'disconnected') {
      return;
    }
    setSandboxInstance((prev) => prev + 1);
    setConnectionState('connecting');
  }, [connectionState]);

  const disconnect = useCallback(() => {
    if (listenerRef.current) {
      window.removeEventListener('message', listenerRef.current);
      listenerRef.current = undefined;
    }
    if (handshakeTimeoutRef.current) {
      window.clearTimeout(handshakeTimeoutRef.current);
      handshakeTimeoutRef.current = undefined;
    }
    setConnectionState('disconnected');
  }, []);

  useEffect(() => {
    if (connectionState !== 'connecting') {
      return undefined;
    }

    const handleMessage = (event) => {
      if (!event || !event.data || event.data.source !== 'sandboxed-target') {
        return;
      }
      if (event.data.type === 'sandbox-ready') {
        setConnectionState('connected');
      }
    };

    listenerRef.current = handleMessage;
    window.addEventListener('message', handleMessage);

    const fallback = window.setTimeout(() => {
      setConnectionState((state) => (state === 'connecting' ? 'connected' : state));
    }, 500);
    handshakeTimeoutRef.current = fallback;

    return () => {
      window.removeEventListener('message', handleMessage);
      listenerRef.current = undefined;
      window.clearTimeout(fallback);
      handshakeTimeoutRef.current = undefined;
    };
  }, [connectionState]);

  useEffect(() => () => {
    if (listenerRef.current) {
      window.removeEventListener('message', listenerRef.current);
    }
    if (handshakeTimeoutRef.current) {
      window.clearTimeout(handshakeTimeoutRef.current);
    }
  }, []);

  const next = () => {
    if (step < steps.length - 1) {
      setStep(step + 1);
    }
  };

  const resetLab = () => {
    try {
      localStorage.removeItem('beef-lab-ok');
    } catch {
      // ignore
    }
    disconnect();
    setStep(0);
  };

  const statusCopy = CONNECTION_STATE_COPY[connectionState];

  const steps = useMemo(
    () => [
      {
        title: 'Disclaimer',
        body:
          'Use these security tools only in environments where you have explicit authorization. Unauthorized testing is illegal.',
        action: 'Begin',
      },
      {
        title: 'Sandboxed Target',
        body: 'The iframe below hosts an isolated page for demonstration. It runs entirely locally.',
        render: (
          <div className="space-y-3">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <span className="text-xs sm:text-sm" aria-live="polite">
                Hook status:
                {' '}
                <span className="font-semibold">{statusCopy}</span>
              </span>
              <div className="flex gap-2">
                {connectionState === 'disconnected' ? (
                  <button
                    type="button"
                    onClick={connect}
                    className="px-3 py-1 text-xs sm:text-sm rounded bg-ub-primary text-white"
                  >
                    Connect Hook
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={disconnect}
                    className="px-3 py-1 text-xs sm:text-sm rounded bg-ub-orange text-black"
                  >
                    Disconnect
                  </button>
                )}
              </div>
            </div>
            {connectionState === 'disconnected' ? (
              <div className="w-full h-48 border border-dashed border-ub-grey-200 flex items-center justify-center text-xs sm:text-sm text-ub-grey-200 rounded">
                Sandbox offline. Connect to rebuild the lab.
              </div>
            ) : (
              <iframe
                key={sandboxInstance}
                title="sandbox"
                className="w-full h-48 border"
                sandbox="allow-scripts"
                srcDoc={SANDBOX_DOCUMENT}
              />
            )}
          </div>
        ),
        action: 'Next',
      },
      {
        title: 'Simulated Hook',
        body:
          connectionState === 'connected'
            ? 'The target has been locally “hooked”. No packets left this machine.'
            : 'No active hook is connected. Use the reconnect controls to resume the local simulation.',
        action: 'Next',
      },
      {
        title: 'Run Demo Module',
        body: 'A deterministic module runs and prints output below.',
        render: (
          <pre className="bg-black text-white p-2 text-xs rounded">{`Demo module executed\nResult: success`}</pre>
        ),
        action: 'Next',
      },
      {
        title: 'Payload Builder',
        body: 'Craft benign payload pages. Copy or preview the generated HTML locally.',
        render: <PayloadBuilder />,
        action: 'Next',
      },
      {
        title: 'Complete',
        body: 'The lab sequence is finished. Reset to clear all data.',
        action: 'Reset Lab',
        final: true,
      },
    ],
    [connect, connectionState, disconnect, sandboxInstance, statusCopy]
  );

  const current = steps[step];

  return (
    <div className="p-4 text-white bg-ub-cool-grey h-full w-full flex flex-col">
      <h2 className="text-xl mb-4">{current.title}</h2>
      <p className="mb-4 text-sm">{current.body}</p>
      {current.render && <div className="mb-4">{current.render}</div>}
      <button
        type="button"
        onClick={current.final ? resetLab : next}
        className="self-start px-3 py-1 bg-ub-primary text-white rounded"
      >
        {current.action}
      </button>
      <p className="mt-4 text-xs">
        For educational use only. No network calls occur during this demo.
      </p>
    </div>
  );
}
