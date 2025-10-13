'use client';

import React, { useMemo, useRef, useState } from 'react';
import TabbedWindow, { TabDefinition } from '../../components/ui/TabbedWindow';
import { DEFAULT_SSH_CONFIG, SSH_PRESETS, type SSHConfig } from './config';
import { buildSSHCommand, validateSSHConfig } from './utils';

type CopyState = 'idle' | 'copied' | 'error';

type SeverityLevel = 'low' | 'medium' | 'high';
type SessionStatus = 'active' | 'queued' | 'complete';

interface SessionSummaryCard {
  id: string;
  label: string;
  value: string;
  context: string;
  status: SessionStatus;
}

interface CommandLogEntry {
  id: string;
  timestamp: string;
  command: string;
  narrative: string;
  status: SessionStatus;
}

interface MitigationNote {
  id: string;
  title: string;
  detail: string;
  severity: SeverityLevel;
}

const SEVERITY_STYLES: Record<SeverityLevel, string> = {
  high: 'border-white/10 bg-kali-severity-high/25 text-white shadow-[0_0_0_1px_rgba(255,255,255,0.08)]',
  medium: 'border-white/10 bg-kali-severity-medium/25 text-white shadow-[0_0_0_1px_rgba(255,255,255,0.08)]',
  low: 'border-white/10 bg-kali-severity-low/25 text-white shadow-[0_0_0_1px_rgba(255,255,255,0.08)]',
};

const STATUS_STYLES: Record<SessionStatus, string> = {
  active: 'border-white/10 bg-kali-control text-slate-950 shadow-kali-panel',
  queued:
    'border-white/10 bg-kali-info/80 text-white shadow-[0_0_0_1px_rgba(0,0,0,0.25)] backdrop-blur-sm',
  complete:
    'border-white/10 bg-kali-primary/90 text-slate-950 shadow-[0_0_0_1px_rgba(255,255,255,0.08)]',
};

const SESSION_SUMMARY: SessionSummaryCard[] = [
  {
    id: 'entry-node',
    label: 'Entry node',
    value: 'bounty.box:2222',
    context: 'Gateway hardened with verbose logging and MFA audit trail.',
    status: 'active',
  },
  {
    id: 'credential',
    label: 'Credential source',
    value: '~/.ssh/bug-bounty (ed25519)',
    context: 'Passphrase-protected key stored in local agent cache for 15m.',
    status: 'complete',
  },
  {
    id: 'pivot',
    label: 'Pivot target',
    value: 'internal-app@10.13.37.5',
    context: 'Awaiting jump-host approval prior to port forwarding.',
    status: 'queued',
  },
];

const COMMAND_LOG: CommandLogEntry[] = [
  {
    id: 'connect',
    timestamp: '00:00:02',
    command: 'ssh -p 2222 pentest@bounty.box -i ~/.ssh/bug-bounty -C -v',
    narrative: 'Initial connection to the hardened jump box negotiated Ed25519 keys and enabled verbose logging.',
    status: 'complete',
  },
  {
    id: 'agent-check',
    timestamp: '00:00:11',
    command: 'ssh-add -L | grep bounty',
    narrative: 'Confirmed the agent holds the scoped key material before forwarding to downstream pivots.',
    status: 'complete',
  },
  {
    id: 'pivot-attempt',
    timestamp: '00:01:27',
    command: 'ssh internal-app@10.13.37.5 -J pentest@bounty.box -o ServerAliveInterval=60',
    narrative: 'Queued pivot into the internal application node. Awaiting bastion approval and port checks.',
    status: 'queued',
  },
];

const MITIGATION_NOTES: MitigationNote[] = [
  {
    id: 'key-rotation',
    title: 'Rotate shared jump-box keys',
    detail: 'Shorten the validity window for the bug bounty key pair and alert on unused authorized_keys entries.',
    severity: 'high',
  },
  {
    id: 'agent-forward',
    title: 'Restrict agent forwarding scope',
    detail: 'Limit agent forwarding to approved hosts and enforce per-hop confirmation prompts.',
    severity: 'medium',
  },
  {
    id: 'session-logging',
    title: 'Enrich session logging',
    detail: 'Stream SSH session metadata into the SIEM with correlation IDs to accelerate investigations.',
    severity: 'low',
  },
];

const SSHBuilder: React.FC = () => {
  const [config, setConfig] = useState<SSHConfig>(DEFAULT_SSH_CONFIG);
  const [selectedPreset, setSelectedPreset] = useState<string>('');
  const [copyState, setCopyState] = useState<CopyState>('idle');

  const validationErrors = useMemo(() => validateSSHConfig(config), [config]);
  const isValid = useMemo(() => Object.keys(validationErrors).length === 0, [validationErrors]);
  const command = useMemo(() => buildSSHCommand(config), [config]);

  const updateField = <Key extends keyof SSHConfig>(key: Key, value: SSHConfig[Key]) => {
    setConfig((current) => ({ ...current, [key]: value }));
    setSelectedPreset('');
    setCopyState('idle');
  };

  const applyPreset = (presetId: string) => {
    setSelectedPreset(presetId);
    const preset = SSH_PRESETS.find((item) => item.id === presetId);
    if (preset) {
      setConfig({ ...preset.config });
    } else {
      setConfig({ ...DEFAULT_SSH_CONFIG });
    }
    setCopyState('idle');
  };

  const handleCopy = async () => {
    if (!isValid || !command) {
      return;
    }

    try {
      if (typeof navigator === 'undefined' || !navigator.clipboard?.writeText) {
        throw new Error('Clipboard API unavailable');
      }

      await navigator.clipboard.writeText(command);
      setCopyState('copied');
    } catch (error) {
      console.error('Failed to copy command', error);
      setCopyState('error');
    }
  };

  const handleExport = () => {
    if (!isValid || !command) {
      return;
    }

    const blob = new Blob([`${command}\n`], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'ssh-command.txt';
    anchor.click();
    URL.revokeObjectURL(url);
    setCopyState('idle');
  };

  return (
    <div className="h-full overflow-auto bg-kali-surface/95 p-6 text-white">
      <div className="mx-auto flex max-w-5xl flex-col gap-6">
        <header className="space-y-3">
          <h1 className="text-2xl font-semibold">SSH Command Builder</h1>
          <p className="text-sm text-kali-info">
            Generate an SSH command without executing it. Learn more at{' '}
            <a
              href="https://www.openssh.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-kali-accent underline underline-offset-2 hover:text-kali-accent/80"
            >
              the OpenSSH project page
            </a>
            .
          </p>
        </header>
        <div className="rounded-2xl border border-white/10 bg-kali-surface/80 p-4 text-sm shadow-kali-panel backdrop-blur">
          <label
            htmlFor="ssh-preset"
            className="mb-2 block text-xs font-semibold uppercase tracking-wide text-white/70"
          >
            Preset library
          </label>
          <select
            id="ssh-preset"
            value={selectedPreset}
            onChange={(event) => applyPreset(event.target.value)}
            className="w-full rounded-lg border border-white/10 bg-kali-background/80 px-3 py-2 text-sm text-white shadow-inner shadow-black/30 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-kali-focus"
          >
            <option value="">Custom configuration</option>
            {SSH_PRESETS.map((preset) => (
              <option key={preset.id} value={preset.id}>
                {preset.label}
              </option>
            ))}
          </select>
          {selectedPreset && (
            <p className="mt-3 text-xs text-white/70">
              {SSH_PRESETS.find((preset) => preset.id === selectedPreset)?.description}
            </p>
          )}
        </div>
        <form
          onSubmit={(event) => event.preventDefault()}
          className="space-y-4 rounded-2xl border border-white/10 bg-kali-surface/80 p-4 shadow-kali-panel backdrop-blur"
        >
          <div>
            <label htmlFor="ssh-user" className="mb-1 block text-sm font-medium text-white">
              Username
            </label>
            <input
              id="ssh-user"
              type="text"
              className="w-full rounded-lg border border-white/10 bg-kali-background/80 px-3 py-2 text-white shadow-inner shadow-black/30 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-kali-focus"
              value={config.user}
              onChange={(event) => updateField('user', event.target.value)}
              autoComplete="username"
            />
          </div>
          <div>
            <label htmlFor="ssh-host" className="mb-1 block text-sm font-medium text-white">
              Host <span className="text-kali-severity-high">*</span>
            </label>
            <input
              id="ssh-host"
              type="text"
              className="w-full rounded-lg border border-white/10 bg-kali-background/80 px-3 py-2 text-white shadow-inner shadow-black/30 placeholder:text-white/40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-kali-focus"
              value={config.host}
              onChange={(event) => updateField('host', event.target.value)}
              placeholder="server.example.com"
              required
              aria-invalid={validationErrors.host ? 'true' : 'false'}
              aria-describedby={validationErrors.host ? 'ssh-host-error' : undefined}
            />
            {validationErrors.host && (
              <p id="ssh-host-error" className="mt-1 text-xs text-kali-severity-high">
                {validationErrors.host}
              </p>
            )}
          </div>
          <div>
            <label htmlFor="ssh-port" className="mb-1 block text-sm font-medium text-white">
              Port
            </label>
            <input
              id="ssh-port"
              type="number"
              className="w-full rounded-lg border border-white/10 bg-kali-background/80 px-3 py-2 text-white shadow-inner shadow-black/30 placeholder:text-white/40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-kali-focus"
              value={config.port}
              onChange={(event) => updateField('port', event.target.value)}
              min={1}
              max={65535}
              placeholder="22"
              aria-invalid={validationErrors.port ? 'true' : 'false'}
              aria-describedby={validationErrors.port ? 'ssh-port-error' : undefined}
            />
            {validationErrors.port && (
              <p id="ssh-port-error" className="mt-1 text-xs text-kali-severity-high">
                {validationErrors.port}
              </p>
            )}
          </div>
          <div>
            <label htmlFor="ssh-identity" className="mb-1 block text-sm font-medium text-white">
              Identity file
            </label>
            <input
              id="ssh-identity"
              type="text"
              className="w-full rounded-lg border border-white/10 bg-kali-background/80 px-3 py-2 text-white shadow-inner shadow-black/30 placeholder:text-white/40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-kali-focus"
              value={config.identityFile}
              onChange={(event) => updateField('identityFile', event.target.value)}
              placeholder="~/.ssh/id_ed25519"
            />
          </div>
          <fieldset className="space-y-2">
            <legend className="text-sm font-medium text-white">Session options</legend>
            <label className="flex items-center gap-2 text-sm text-white/90">
              <input
                type="checkbox"
                checked={config.useCompression}
                onChange={(event) => updateField('useCompression', event.target.checked)}
                className="h-4 w-4 rounded border-white/20 bg-kali-background/80 accent-kali-control focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-kali-focus"
              />
              <span>Enable compression (-C)</span>
            </label>
            <label className="flex items-center gap-2 text-sm text-white/90">
              <input
                type="checkbox"
                checked={config.enableAgentForwarding}
                onChange={(event) => updateField('enableAgentForwarding', event.target.checked)}
                className="h-4 w-4 rounded border-white/20 bg-kali-background/80 accent-kali-control focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-kali-focus"
              />
              <span>Forward SSH agent (-A)</span>
            </label>
          </fieldset>
          <div>
            <label htmlFor="ssh-extra" className="mb-1 block text-sm font-medium text-white">
              Extra options
            </label>
            <textarea
              id="ssh-extra"
              className="min-h-[4rem] w-full rounded-lg border border-white/10 bg-kali-background/80 px-3 py-2 text-white shadow-inner shadow-black/30 placeholder:text-white/40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-kali-focus"
              value={config.extraOptions}
              onChange={(event) => updateField('extraOptions', event.target.value)}
              placeholder="-o StrictHostKeyChecking=accept-new"
            />
            <p className="mt-1 text-xs text-white/60">
              Options are appended to the command. Separate multiple flags with spaces or new lines.
            </p>
          </div>
        </form>
        <section className="space-y-6">
          <div className="rounded-2xl border border-white/10 bg-kali-surface/80 p-4 shadow-kali-panel backdrop-blur">
            <header className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-lg font-semibold">Command Preview</h2>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={handleCopy}
                  disabled={!isValid || command === 'ssh'}
                  className="inline-flex items-center justify-center rounded-lg border border-white/10 bg-kali-control px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-slate-950 shadow-[0_8px_24px_rgba(12,131,255,0.2)] transition hover:bg-kali-control/90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-kali-focus disabled:cursor-not-allowed disabled:border-white/10 disabled:bg-white/10 disabled:text-white/40"
                >
                  Copy command
                </button>
                <button
                  type="button"
                  onClick={handleExport}
                  disabled={!isValid || command === 'ssh'}
                  className="inline-flex items-center justify-center rounded-lg border border-white/10 bg-kali-primary px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-slate-950 shadow-[0_8px_24px_rgba(15,148,210,0.25)] transition hover:bg-kali-primary/90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-kali-focus disabled:cursor-not-allowed disabled:border-white/10 disabled:bg-white/10 disabled:text-white/40"
                >
                  Export to file
                </button>
              </div>
            </header>
            <div className="mt-3 rounded-xl border border-kali-control/40 bg-kali-dark/80 p-4 shadow-inner">
              <pre className="max-h-48 overflow-auto text-sm leading-relaxed text-kali-control" aria-live="polite">
                {isValid && command !== 'ssh' ? command : '# Fill in the form to generate a command'}
              </pre>
            </div>
            <div className="mt-3 flex flex-wrap gap-3 text-xs">
              {copyState === 'copied' && (
                <span className="rounded-full border border-white/10 bg-kali-control px-3 py-1 font-semibold text-slate-950 shadow-[0_0_0_1px_rgba(255,255,255,0.08)]">
                  Command copied to clipboard.
                </span>
              )}
              {copyState === 'error' && (
                <span className="rounded-full border border-white/10 bg-kali-severity-high/30 px-3 py-1 font-semibold text-white">
                  Clipboard unavailable. Try manual copy.
                </span>
              )}
            </div>
          </div>
          <div className="space-y-4">
            <div>
              <h2 className="mb-2 text-lg font-semibold">Session Summary</h2>
              <div className="grid gap-4 md:grid-cols-3">
                {SESSION_SUMMARY.map((card) => (
                  <article
                    key={card.id}
                    className="rounded-2xl border border-white/10 bg-kali-surface/80 p-4 text-white shadow-kali-panel backdrop-blur"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="text-sm font-semibold uppercase tracking-wide text-white/70">
                        {card.label}
                      </h3>
                      <span className={`rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-wide ${STATUS_STYLES[card.status]}`}>
                        {card.status}
                      </span>
                    </div>
                    <p className="mt-3 text-sm font-mono text-kali-control">{card.value}</p>
                    <p className="mt-2 text-xs text-white/70">{card.context}</p>
                  </article>
                ))}
              </div>
            </div>
            <div>
              <h2 className="mb-2 text-lg font-semibold">Command Log</h2>
              <div className="space-y-3">
                {COMMAND_LOG.map((entry) => (
                  <article
                    key={entry.id}
                    className="rounded-2xl border border-white/10 bg-kali-surface/80 p-4 text-white shadow-kali-panel backdrop-blur"
                  >
                    <header className="flex flex-wrap items-center justify-between gap-2 text-xs text-white/60">
                      <span className="font-semibold uppercase tracking-wide">{entry.timestamp}</span>
                      <span className={`rounded-full border px-3 py-1 font-semibold uppercase tracking-wide ${STATUS_STYLES[entry.status]}`}>
                        {entry.status}
                      </span>
                    </header>
                    <div className="mt-3 rounded-xl border border-kali-control/40 bg-kali-dark/80 p-3 shadow-inner">
                      <pre className="overflow-auto text-[0.8rem] leading-relaxed text-kali-control">
                        {entry.command}
                      </pre>
                    </div>
                    <p className="mt-3 text-sm text-white/80">{entry.narrative}</p>
                  </article>
                ))}
              </div>
            </div>
            <div>
              <h2 className="mb-2 text-lg font-semibold">Mitigation Notes</h2>
              <div className="space-y-3">
                {MITIGATION_NOTES.map((note) => (
                  <article
                    key={note.id}
                    className="rounded-2xl border border-white/10 bg-kali-surface/80 p-4 text-white shadow-kali-panel backdrop-blur"
                  >
                    <header className="flex items-center justify-between gap-2">
                      <h3 className="text-base font-semibold text-white">{note.title}</h3>
                      <span className={`rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-wide ${SEVERITY_STYLES[note.severity]}`}>
                        {note.severity}
                      </span>
                    </header>
                    <p className="mt-2 text-sm text-white/80">{note.detail}</p>
                  </article>
                ))}
              </div>
            </div>
          </div>
        </section>
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
      className="min-h-screen bg-kali-background text-kali-text"
      initialTabs={[createTab()]}
      onNewTab={createTab}
    />
  );
};

export default SSHPreview;
