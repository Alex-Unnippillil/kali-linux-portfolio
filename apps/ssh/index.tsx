'use client';

import React, { useRef, useState } from 'react';
import TabbedWindow, { TabDefinition } from '../../components/ui/TabbedWindow';
import SftpSidecar from './components/SftpSidecar';

const SSHBuilder: React.FC = () => {
  const [user, setUser] = useState('');
  const [host, setHost] = useState('');
  const [port, setPort] = useState('');
  const command = `ssh ${user ? `${user}@` : ''}${host}${port ? ` -p ${port}` : ''}`.trim();

  return (
    <div className="flex h-full flex-col bg-gray-900 text-white">
      <div className="flex-1 overflow-auto p-4">
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
        <div className="rounded border border-gray-800 bg-gray-950 p-4 text-xs text-gray-300">
          <p className="mb-1 font-semibold uppercase tracking-wide text-gray-400">Tips</p>
          <ul className="list-disc space-y-1 pl-5">
            <li>Populate the username and host to build the basic command.</li>
            <li>Add a port when connecting to non-standard SSH services.</li>
            <li>Use the SFTP sidecar to stage files before running the command.</li>
          </ul>
        </div>
      </div>
      <div className="border-t border-gray-800 bg-black/70 p-4">
        <h2 className="mb-2 text-lg">Command Preview</h2>
        <pre className="overflow-auto rounded bg-black/80 p-3 font-mono text-green-400">
          {command || '# Fill in the form to generate a command'}
        </pre>
      </div>
    </div>
  );
};

const SSHSessionPane: React.FC = () => (
  <div className="flex h-full flex-col bg-gray-950 text-white lg:flex-row">
    <div className="flex flex-1 flex-col overflow-hidden border-b border-gray-800 lg:border-b-0 lg:border-r">
      <SSHBuilder />
    </div>
    <SftpSidecar className="lg:w-[26rem] xl:w-[30rem]" />
  </div>
);

const SSHPreview: React.FC = () => {
  const countRef = useRef(1);

  const createTab = (): TabDefinition => {
    const id = Date.now().toString();
    return { id, title: `Session ${countRef.current++}`, content: <SSHSessionPane /> };
  };

  return (
    <TabbedWindow
      className="min-h-screen bg-gray-950 text-white"
      initialTabs={[createTab()]}
      onNewTab={createTab}
    />
  );
};

export default SSHPreview;
