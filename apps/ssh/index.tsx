'use client';

import React, { useEffect, useRef, useState } from 'react';
import TabbedWindow, { TabDefinition } from '../../components/ui/TabbedWindow';
import { useHeartbeat } from './hooks/useHeartbeat';

const SSHBuilder: React.FC = () => {
  const [user, setUser] = useState('');
  const [host, setHost] = useState('');
  const [port, setPort] = useState('');
  const [sessionActive, setSessionActive] = useState(true);
  const [recoveryMessage, setRecoveryMessage] = useState<string | null>(null);

  const { status, countdown, waitForReconnect } = useHeartbeat({
    onDisconnect: () => {
      setSessionActive(false);
      setRecoveryMessage('Pseudo session paused until the connection returns.');
    },
  });

  useEffect(() => {
    if (status === 'reconnecting') {
      let cancelled = false;
      setRecoveryMessage('Network recovered. Restoring pseudo session...');
      waitForReconnect().then(() => {
        if (!cancelled) {
          setSessionActive(true);
          setRecoveryMessage('Session reconnected after network recovery.');
        }
      });
      return () => {
        cancelled = true;
      };
    }
    return undefined;
  }, [status, waitForReconnect]);

  const command = `ssh ${user ? `${user}@` : ''}${host}${port ? ` -p ${port}` : ''}`.trim();

  const bannerMessage =
    status === 'disconnected'
      ? 'Connection lost. Trying to reconnect…'
      : status === 'reconnecting'
      ? `Network restored. Reopening session in ${Math.max(countdown ?? 0, 0)}s…`
      : null;

  const defaultSessionMessage = sessionActive
    ? command
      ? `Pseudo session ready. Command preview: ${command}`
      : 'Pseudo session ready. Fill in the form to generate a command.'
    : 'Pseudo session paused until the connection returns.';

  const sessionMessage = recoveryMessage ?? defaultSessionMessage;

  return (
    <div className="h-full bg-gray-900 p-4 text-white overflow-auto">
      {bannerMessage && (
        <div
          data-testid="ssh-connection-banner"
          className="mb-4 rounded border border-yellow-400 bg-yellow-500/10 px-3 py-2 text-yellow-300"
        >
          {bannerMessage}
        </div>
      )}
      <h1 className="mb-4 text-2xl">SSH Command Builder</h1>
      <p className="mb-4 text-sm text-yellow-300">
        Generate an SSH command without executing it. Learn more at{' '}
        <a
          href="https://www.openssh.com/"
          target="_blank"
          rel="noopener noreferrer"
          className="underline text-blue-400"
        >
          the OpenSSH project page
        </a>
        .
      </p>
      <form onSubmit={(e) => e.preventDefault()} className="mb-4 space-y-4">
        <div>
          <label htmlFor="ssh-user" className="mb-1 block text-sm font-medium">
            Username
          </label>
          <input
            id="ssh-user"
            type="text"
            className="w-full rounded border border-gray-700 bg-gray-800 p-2 text-white"
            aria-label="SSH username"
            value={user}
            onChange={(e) => setUser(e.target.value)}
          />
        </div>
        <div>
          <label htmlFor="ssh-host" className="mb-1 block text-sm font-medium">
            Host
          </label>
          <input
            id="ssh-host"
            type="text"
            className="w-full rounded border border-gray-700 bg-gray-800 p-2 text-white"
            aria-label="SSH host"
            value={host}
            onChange={(e) => setHost(e.target.value)}
          />
        </div>
        <div>
          <label htmlFor="ssh-port" className="mb-1 block text-sm font-medium">
            Port (optional)
          </label>
          <input
            id="ssh-port"
            type="number"
            className="w-full rounded border border-gray-700 bg-gray-800 p-2 text-white"
            aria-label="SSH port"
            value={port}
            onChange={(e) => setPort(e.target.value)}
          />
        </div>
      </form>
      <div>
        <h2 className="mb-2 text-lg">Pseudo Session</h2>
        <div className="rounded border border-gray-700 bg-black p-3">
          <div className="mb-2 flex items-center justify-between text-xs uppercase tracking-wide text-gray-400">
            <span>Status</span>
            <span data-testid="ssh-session-status" className="font-semibold text-white">
              {sessionActive ? 'Connected' : 'Paused'}
            </span>
          </div>
          <p data-testid="ssh-session-message" className="text-sm text-gray-300">
            {sessionMessage}
          </p>
          <pre className="mt-3 overflow-auto rounded bg-gray-900 p-3 font-mono text-green-400">
            {sessionActive
              ? command || '# Fill in the form to generate a command'
              : '# Session paused - waiting for the network to recover'}
          </pre>
        </div>
      </div>
    </div>
  );
};

const SSHPreview: React.FC = () => {
  const countRef = useRef(1);

  const createTab = (): TabDefinition => {
    const id = Date.now().toString();
    return { id, title: `Session ${countRef.current++}`, content: <SSHBuilder /> };
  };

  return (
    <TabbedWindow
      className="min-h-screen bg-gray-900 text-white"
      initialTabs={[createTab()]}
      onNewTab={createTab}
    />
  );
};

export default SSHPreview;
