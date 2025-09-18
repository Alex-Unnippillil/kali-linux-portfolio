'use client';

import React, { useEffect, useRef, useState } from 'react';
import TabbedWindow, { TabDefinition } from '../../components/ui/TabbedWindow';

type TransferDirection = 'Upload' | 'Download';
type TransferStatus = 'Idle' | 'Transferring' | 'Completed';

interface TransferTemplate {
  id: string;
  file: string;
  size: string;
  direction: TransferDirection;
}

interface TransferState extends TransferTemplate {
  status: TransferStatus;
  progress: number;
  lastCompleted?: string;
}

interface PortForwardState {
  id: string;
  label: string;
  local: string;
  remote: string;
  protocol: string;
  enabled: boolean;
}

const SFTP_QUEUE: TransferTemplate[] = [
  {
    id: 'logs',
    file: 'logs/secure-copy.tar.gz',
    size: '24 MB',
    direction: 'Download',
  },
  {
    id: 'reports',
    file: 'reports/latest-findings.csv',
    size: '2 MB',
    direction: 'Upload',
  },
  {
    id: 'artifacts',
    file: 'artifacts/session-memo.txt',
    size: '4 KB',
    direction: 'Upload',
  },
];

const PORT_FORWARD_RULES: PortForwardState[] = [
  {
    id: 'jump-host',
    label: 'Jump host shell',
    local: '127.0.0.1:2222',
    remote: '10.0.5.10:22',
    protocol: 'SSH',
    enabled: true,
  },
  {
    id: 'wiki',
    label: 'Internal wiki',
    local: '127.0.0.1:8443',
    remote: '10.0.5.11:443',
    protocol: 'HTTPS',
    enabled: false,
  },
  {
    id: 'metrics',
    label: 'Metrics dashboard',
    local: '127.0.0.1:9000',
    remote: '10.0.5.42:9000',
    protocol: 'HTTP',
    enabled: true,
  },
];

const statusTone = {
  Completed: 'text-green-300',
  Transferring: 'text-yellow-300',
  Idle: 'text-gray-200',
} as const;

const SFTPSidecar: React.FC = () => {
  const [transfers, setTransfers] = useState<TransferState[]>(() =>
    SFTP_QUEUE.map((item) => ({ ...item, status: 'Idle', progress: 0 })),
  );
  const timers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  useEffect(() => {
    return () => {
      Object.values(timers.current).forEach((timer) => clearTimeout(timer));
      timers.current = {};
    };
  }, []);

  const runTransfer = (id: string) => {
    setTransfers((prev) =>
      prev.map((transfer) =>
        transfer.id === id
          ? { ...transfer, status: 'Transferring', progress: 15 }
          : transfer,
      ),
    );

    if (timers.current[id]) {
      clearTimeout(timers.current[id]);
    }

    timers.current[id] = setTimeout(() => {
      setTransfers((prev) =>
        prev.map((transfer) =>
          transfer.id === id
            ? {
                ...transfer,
                status: 'Completed',
                progress: 100,
                lastCompleted: new Date().toLocaleTimeString(),
              }
            : transfer,
        ),
      );
      delete timers.current[id];
    }, 400);
  };

  return (
    <section
      className="mt-6 rounded border border-gray-700 bg-gray-800 p-4"
      data-testid="sftp-sidecar"
      aria-label="SFTP sidecar"
    >
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-lg font-semibold">SFTP Sidecar</h2>
        <span className="rounded bg-gray-700 px-2 py-1 text-xs text-gray-300">Mock transfers</span>
      </div>
      <p className="mb-4 text-xs text-gray-300">
        Queue simulated SFTP transfers. All actions stay on this page and never reach a live host.
      </p>
      <ul className="space-y-3">
        {transfers.map((transfer) => (
          <li
            key={transfer.id}
            data-testid={`sftp-transfer-${transfer.id}`}
            className="flex items-start justify-between rounded border border-gray-700 bg-gray-900 p-3"
          >
            <div>
              <div className="text-sm font-medium text-white">{transfer.file}</div>
              <div className="text-xs text-gray-400">
                {transfer.direction} • {transfer.size}
              </div>
              <div className="text-xs text-gray-400">
                Status:{' '}
                <span
                  data-testid={`sftp-status-${transfer.id}`}
                  className={statusTone[transfer.status]}
                >
                  {transfer.status}
                </span>{' '}
                • Progress:{' '}
                <span data-testid={`sftp-progress-${transfer.id}`}>{transfer.progress}%</span>
              </div>
              {transfer.lastCompleted && (
                <div className="text-[10px] text-gray-500">
                  Last completed: {transfer.lastCompleted}
                </div>
              )}
            </div>
            <button
              type="button"
              data-testid={`sftp-action-${transfer.id}`}
              className="self-center rounded bg-blue-600 px-3 py-1 text-xs font-semibold text-white hover:bg-blue-500 disabled:cursor-not-allowed disabled:bg-gray-600"
              onClick={() => runTransfer(transfer.id)}
              disabled={transfer.status === 'Transferring'}
            >
              {transfer.status === 'Completed' ? 'Re-run' : 'Run transfer'}
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
};

const PortForwardPanel: React.FC = () => {
  const [forwards, setForwards] = useState<PortForwardState[]>(() =>
    PORT_FORWARD_RULES.map((rule) => ({ ...rule })),
  );

  const toggleForward = (id: string) => {
    setForwards((prev) =>
      prev.map((forward) =>
        forward.id === id
          ? { ...forward, enabled: !forward.enabled }
          : forward,
      ),
    );
  };

  return (
    <section
      className="mt-6 rounded border border-gray-700 bg-gray-800 p-4"
      data-testid="port-forward-panel"
      aria-label="Port forwarding"
    >
      <h2 className="mb-3 text-lg font-semibold">Port Forwarding</h2>
      <p className="mb-4 text-xs text-gray-300">
        Toggle forwards to keep track of simulated SSH tunnels. These switches only update UI state.
      </p>
      <ul className="space-y-3">
        {forwards.map((forward) => (
          <li
            key={forward.id}
            data-testid={`port-forward-${forward.id}`}
            className="flex items-start justify-between rounded border border-gray-700 bg-gray-900 p-3"
          >
            <div>
              <div className="text-sm font-medium text-white">{forward.label}</div>
              <div className="text-xs text-gray-400">
                Local {forward.local} → Remote {forward.remote} ({forward.protocol})
              </div>
              <div className="text-xs text-gray-400">
                Status:{' '}
                <span
                  data-testid={`port-forward-status-${forward.id}`}
                  className={forward.enabled ? 'text-green-300' : 'text-red-300'}
                >
                  {forward.enabled ? 'Enabled' : 'Disabled'}
                </span>
              </div>
            </div>
            <button
              type="button"
              data-testid={`port-forward-toggle-${forward.id}`}
              className="self-center rounded bg-purple-600 px-3 py-1 text-xs font-semibold text-white hover:bg-purple-500"
              onClick={() => toggleForward(forward.id)}
              aria-pressed={forward.enabled}
            >
              {forward.enabled ? 'Disable' : 'Enable'}
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
};

const SSHBuilder: React.FC = () => {
  const [user, setUser] = useState('');
  const [host, setHost] = useState('');
  const [port, setPort] = useState('');
  const command = `ssh ${user ? `${user}@` : ''}${host}${port ? ` -p ${port}` : ''}`.trim();

  return (
    <div className="h-full bg-gray-900 p-4 text-white overflow-auto">
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
            value={port}
            onChange={(e) => setPort(e.target.value)}
          />
        </div>
      </form>
      <div>
        <h2 className="mb-2 text-lg">Command Preview</h2>
        <pre className="overflow-auto rounded bg-black p-2 font-mono text-green-400">
          {command || '# Fill in the form to generate a command'}
        </pre>
      </div>
      <SFTPSidecar />
      <PortForwardPanel />
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
