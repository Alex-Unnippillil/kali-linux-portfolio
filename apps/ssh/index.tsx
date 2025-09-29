'use client';

import React, { useEffect, useRef, useState } from 'react';
import TabbedWindow, { TabDefinition } from '../../components/ui/TabbedWindow';

type SSHSnippet = {
  id: string;
  title: string;
  description: string;
  command: string;
};

type SSHCategory = {
  id: string;
  title: string;
  description: string;
  snippets: SSHSnippet[];
};

const sshCategories: SSHCategory[] = [
  {
    id: 'basics',
    title: 'Basic Connections',
    description: 'Quick commands for everyday logins and host management.',
    snippets: [
      {
        id: 'password-login',
        title: 'Password login',
        description: 'Connect to a host on the default port using password authentication.',
        command: 'ssh user@example.com',
      },
      {
        id: 'custom-port',
        title: 'Custom port',
        description: 'Target an SSH daemon that listens on a non-standard port.',
        command: 'ssh -p 2222 user@example.com',
      },
      {
        id: 'config-alias',
        title: 'Use config alias',
        description: 'Leverage ~/.ssh/config to connect with a short host alias.',
        command: 'ssh web-prod',
      },
    ],
  },
  {
    id: 'auth',
    title: 'Keys & Authentication',
    description: 'Manage identities and enroll authorized keys for seamless access.',
    snippets: [
      {
        id: 'identity-file',
        title: 'Specify identity file',
        description: 'Explicitly use a private key when authenticating to a host.',
        command: 'ssh -i ~/.ssh/id_ed25519 user@example.com',
      },
      {
        id: 'copy-id',
        title: 'Authorize public key',
        description: 'Install your public key on the remote host for key-based logins.',
        command: 'ssh-copy-id user@example.com',
      },
      {
        id: 'generate-key',
        title: 'Generate new key pair',
        description: 'Create a modern Ed25519 key pair with a descriptive comment.',
        command: 'ssh-keygen -t ed25519 -C "admin@example.com"',
      },
    ],
  },
  {
    id: 'tunnels',
    title: 'Tunneling & Port Forwarding',
    description: 'Expose remote services securely over an encrypted tunnel.',
    snippets: [
      {
        id: 'local-forward',
        title: 'Local port forward',
        description: 'Bind localhost:8080 to an internal web service via a bastion host.',
        command: 'ssh -L 8080:internal.example.com:80 user@bastion',
      },
      {
        id: 'remote-forward',
        title: 'Remote port forward',
        description: 'Publish a local development server through a remote host.',
        command: 'ssh -R 9000:localhost:3000 user@example.com',
      },
      {
        id: 'dynamic-proxy',
        title: 'Dynamic SOCKS proxy',
        description: 'Create a SOCKS5 proxy for flexible pivoting through the SSH host.',
        command: 'ssh -D 1080 user@example.com',
      },
    ],
  },
  {
    id: 'bastion',
    title: 'Bastions & Advanced Options',
    description: 'Chain through jump hosts and keep long-lived control connections.',
    snippets: [
      {
        id: 'proxyjump',
        title: 'ProxyJump bastion',
        description: 'Reach an internal target by automatically hopping through a bastion.',
        command:
          'ssh -J jumpuser@jump.example.com targetuser@target.example.com',
      },
      {
        id: 'control-master',
        title: 'Persistent control master',
        description: 'Multiplex multiple SSH sessions over a single TCP connection.',
        command:
          'ssh -o ControlMaster=auto -o ControlPersist=10m -o ControlPath=~/.ssh/cm-%r@%h:%p user@example.com',
      },
      {
        id: 'background-tunnel',
        title: 'Background tunnel',
        description: 'Start a tunnel in the background without opening an interactive shell.',
        command: 'ssh -f -N -L 5901:localhost:5901 user@example.com',
      },
    ],
  },
  {
    id: 'transfer',
    title: 'File Transfer & Sync',
    description: 'Move data over SSH with common tooling and predictable permissions.',
    snippets: [
      {
        id: 'scp-upload',
        title: 'Upload with scp',
        description: 'Copy a local archive to a remote backup directory.',
        command: 'scp ./backup.tar.gz user@example.com:/var/backups/',
      },
      {
        id: 'scp-download',
        title: 'Download with scp',
        description: 'Retrieve a remote log file for local inspection.',
        command: 'scp user@example.com:/var/log/auth.log ./auth.log',
      },
      {
        id: 'rsync',
        title: 'Rsync over SSH',
        description: 'Synchronize a project directory while preserving permissions.',
        command:
          'rsync -avz -e "ssh -i ~/.ssh/id_ed25519" ./site/ user@example.com:/var/www/site/',
      },
    ],
  },
];

interface SnippetCardProps {
  snippet: SSHSnippet;
  isCopied: boolean;
  onCopy: (snippet: SSHSnippet) => Promise<void> | void;
}

const SnippetCard: React.FC<SnippetCardProps> = ({ snippet, isCopied, onCopy }) => (
  <div className="space-y-3 rounded-lg border border-gray-700 bg-gray-900/70 p-4 shadow-sm">
    <div className="flex items-start justify-between gap-4">
      <div>
        <h3 className="text-lg font-semibold text-blue-200">{snippet.title}</h3>
        <p className="mt-1 text-sm text-gray-300">{snippet.description}</p>
      </div>
      <button
        type="button"
        onClick={() => {
          void onCopy(snippet);
        }}
        className="rounded border border-blue-400 bg-blue-500/20 px-3 py-1 text-sm font-medium text-blue-100 transition hover:bg-blue-500/40 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-300"
        aria-label={`Copy "${snippet.title}" snippet`}
      >
        {isCopied ? 'Copied!' : 'Copy'}
      </button>
    </div>
    <pre className="overflow-x-auto rounded bg-black/70 p-3 text-sm text-green-300">
      <code>{snippet.command}</code>
    </pre>
  </div>
);

interface SSHSnippetGalleryProps {
  clipboard?: Pick<Clipboard, 'writeText'>;
}

export const SSHSnippetGallery: React.FC<SSHSnippetGalleryProps> = ({ clipboard }) => {
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [announcement, setAnnouncement] = useState('');
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const clipboardAPI = clipboard ?? (typeof navigator !== 'undefined' ? navigator.clipboard : undefined);
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const handleCopy = async (snippet: SSHSnippet) => {
    if (!clipboardAPI?.writeText) {
      setCopiedId(null);
      setAnnouncement('Clipboard copy is not supported in this environment.');
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      timeoutRef.current = setTimeout(() => {
        setAnnouncement('');
      }, 2000);
      return;
    }

    try {
      await clipboardAPI.writeText(snippet.command);
      setCopiedId(snippet.id);
      setAnnouncement(`Copied ${snippet.title} to clipboard.`);
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      timeoutRef.current = setTimeout(() => {
        setCopiedId((current) => (current === snippet.id ? null : current));
        setAnnouncement('');
      }, 2000);
    } catch (error) {
      setCopiedId(null);
      setAnnouncement('Clipboard copy failed. Please try again.');
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      timeoutRef.current = setTimeout(() => {
        setAnnouncement('');
      }, 2000);
    }
  };

  return (
    <div className="h-full overflow-y-auto bg-gray-950 text-gray-100">
      <div className="mx-auto flex max-w-5xl flex-col gap-8 p-6">
        <header className="space-y-2">
          <h1 className="text-3xl font-bold text-white">SSH Snippet Gallery</h1>
          <p className="text-sm text-gray-300">
            Explore ready-to-run SSH commands grouped by task. Use the copy buttons to
            drop exact snippets into your terminal without running anything here.
          </p>
        </header>
        <div role="status" aria-live="polite" className="sr-only">
          {announcement}
        </div>
        {sshCategories.map((category) => (
          <section key={category.id} className="space-y-4">
            <div>
              <h2 className="text-2xl font-semibold text-blue-300">{category.title}</h2>
              <p className="mt-1 text-sm text-gray-300">{category.description}</p>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              {category.snippets.map((snippet) => (
                <SnippetCard
                  key={snippet.id}
                  snippet={snippet}
                  isCopied={copiedId === snippet.id}
                  onCopy={handleCopy}
                />
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
};

const SSHPreview: React.FC = () => {
  const countRef = useRef(1);

  const createTab = (): TabDefinition => {
    const id = Date.now().toString();
    return { id, title: `Gallery ${countRef.current++}`, content: <SSHSnippetGallery /> };
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
