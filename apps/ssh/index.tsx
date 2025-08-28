'use client';

import React, { useRef, useState } from 'react';
import LegalInterstitial from '../../components/ui/LegalInterstitial';
import TabbedWindow, { TabDefinition } from '../../components/ui/TabbedWindow';

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
    </div>
  );
};

const SSHPreview: React.FC = () => {
  const [accepted, setAccepted] = useState(false);
  const countRef = useRef(1);

  if (!accepted) {
    return <LegalInterstitial onAccept={() => setAccepted(true)} />;
  }

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
