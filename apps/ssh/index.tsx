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
  high: 'border-[color:color-mix(in_srgb,var(--color-severity-high)_55%,transparent)] bg-[color:color-mix(in_srgb,var(--color-severity-high)_12%,transparent)] text-[color:var(--color-severity-high)]',
  medium:
    'border-[color:color-mix(in_srgb,var(--color-severity-medium)_55%,transparent)] bg-[color:color-mix(in_srgb,var(--color-severity-medium)_12%,transparent)] text-[color:var(--color-severity-medium)]',
  low: 'border-[color:color-mix(in_srgb,var(--color-severity-low)_55%,transparent)] bg-[color:color-mix(in_srgb,var(--color-severity-low)_12%,transparent)] text-[color:var(--color-severity-low)]',
};

const STATUS_STYLES: Record<SessionStatus, string> = {
  active:
    'border-kali-severity-low/45 bg-[color:color-mix(in_srgb,var(--color-severity-low)_14%,transparent)] text-kali-severity-low',
  queued:
    'border-kali-severity-medium/45 bg-[color:color-mix(in_srgb,var(--color-severity-medium)_14%,transparent)] text-kali-severity-medium',
  complete:
    'border-kali-accent/50 bg-[color:color-mix(in_srgb,var(--color-accent)_16%,transparent)] text-kali-accent',
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
    <div className="h-full overflow-auto bg-[color:var(--kali-panel)] p-6 text-[color:var(--color-text)]">
      <div className="mx-auto flex max-w-5xl flex-col gap-6">
        <header className="space-y-3">
          <h1 className="text-2xl font-semibold">SSH Command Builder</h1>
          <p className="text-sm text-kali-severity-medium">
            Generate an SSH command without executing it. Learn more at{' '}
            <a
              href="https://www.openssh.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="underline text-kali-accent"
            >
              the OpenSSH project page
            </a>
            .
          </p>
        </header>
        <div className="rounded-lg border border-[color:var(--kali-panel-border)] bg-[color:color-mix(in_srgb,var(--kali-panel)_88%,transparent_12%)] p-4 shadow-lg shadow-black/30">
          <label htmlFor="ssh-preset" className="mb-2 block text-xs font-semibold uppercase tracking-wide text-[color:var(--color-text)]/85">
            Preset library
          </label>
          <select
            id="ssh-preset"
            value={selectedPreset}
            onChange={(event) => applyPreset(event.target.value)}
            className="w-full rounded border border-[color:var(--kali-panel-border)] bg-[color:color-mix(in_srgb,var(--kali-panel)_82%,transparent_18%)] p-2 text-sm text-[color:var(--color-text)] focus:border-kali-accent focus:outline-none focus:ring-1 focus:ring-kali-accent/40"
          >
            <option value="">Custom configuration</option>
            {SSH_PRESETS.map((preset) => (
              <option key={preset.id} value={preset.id}>
                {preset.label}
              </option>
            ))}
          </select>
          {selectedPreset && (
            <p className="mt-3 text-xs text-[color:var(--color-text)]/70">
              {SSH_PRESETS.find((preset) => preset.id === selectedPreset)?.description}
            </p>
          )}
        </div>
        <form
          onSubmit={(event) => event.preventDefault()}
          className="space-y-4 rounded-lg border border-[color:var(--kali-panel-border)] bg-[color:color-mix(in_srgb,var(--kali-panel)_85%,transparent_15%)] p-4 shadow-lg shadow-black/30"
        >
          <div>
            <label id="ssh-user-label" htmlFor="ssh-user" className="mb-1 block text-sm font-medium">
              Username
            </label>
            <input
              id="ssh-user"
              type="text"
              className="w-full rounded border border-[color:var(--kali-panel-border)] bg-[color:color-mix(in_srgb,var(--kali-panel)_88%,transparent_12%)] p-2 text-[color:var(--color-text)] focus:border-kali-accent focus:outline-none focus:ring-1 focus:ring-kali-accent/40"
              value={config.user}
              onChange={(event) => updateField('user', event.target.value)}
              autoComplete="username"
              aria-labelledby="ssh-user-label"
            />
          </div>
          <div>
            <label id="ssh-host-label" htmlFor="ssh-host" className="mb-1 block text-sm font-medium">
              Host <span className="text-kali-severity-high">*</span>
            </label>
            <input
              id="ssh-host"
              type="text"
              className="w-full rounded border border-[color:var(--kali-panel-border)] bg-[color:color-mix(in_srgb,var(--kali-panel)_88%,transparent_12%)] p-2 text-[color:var(--color-text)] focus:border-kali-accent focus:outline-none focus:ring-1 focus:ring-kali-accent/40"
              value={config.host}
              onChange={(event) => updateField('host', event.target.value)}
              placeholder="server.example.com"
              required
              aria-invalid={validationErrors.host ? 'true' : 'false'}
              aria-describedby={validationErrors.host ? 'ssh-host-error' : undefined}
              aria-labelledby="ssh-host-label"
            />
            {validationErrors.host && (
              <p id="ssh-host-error" className="mt-1 text-xs text-kali-severity-high">
                {validationErrors.host}
              </p>
            )}
          </div>
          <div>
            <label id="ssh-port-label" htmlFor="ssh-port" className="mb-1 block text-sm font-medium">
              Port
            </label>
            <input
              id="ssh-port"
              type="number"
              className="w-full rounded border border-[color:var(--kali-panel-border)] bg-[color:color-mix(in_srgb,var(--kali-panel)_88%,transparent_12%)] p-2 text-[color:var(--color-text)] focus:border-kali-accent focus:outline-none focus:ring-1 focus:ring-kali-accent/40"
              value={config.port}
              onChange={(event) => updateField('port', event.target.value)}
              min={1}
              max={65535}
              placeholder="22"
              aria-invalid={validationErrors.port ? 'true' : 'false'}
              aria-describedby={validationErrors.port ? 'ssh-port-error' : undefined}
              aria-labelledby="ssh-port-label"
            />
            {validationErrors.port && (
              <p id="ssh-port-error" className="mt-1 text-xs text-kali-severity-high">
                {validationErrors.port}
              </p>
            )}
          </div>
          <div>
            <label id="ssh-identity-label" htmlFor="ssh-identity" className="mb-1 block text-sm font-medium">
              Identity file
            </label>
            <input
              id="ssh-identity"
              type="text"
              className="w-full rounded border border-[color:var(--kali-panel-border)] bg-[color:color-mix(in_srgb,var(--kali-panel)_88%,transparent_12%)] p-2 text-[color:var(--color-text)] focus:border-kali-accent focus:outline-none focus:ring-1 focus:ring-kali-accent/40"
              value={config.identityFile}
              onChange={(event) => updateField('identityFile', event.target.value)}
              placeholder="~/.ssh/id_ed25519"
              aria-labelledby="ssh-identity-label"
            />
          </div>
          <fieldset className="space-y-2">
            <legend className="text-sm font-medium">Session options</legend>
            <label className="flex items-center space-x-2 text-sm">
              <input
                type="checkbox"
                checked={config.useCompression}
                onChange={(event) => updateField('useCompression', event.target.checked)}
                className="h-4 w-4 rounded border-[color:var(--kali-panel-border)] bg-[color:color-mix(in_srgb,var(--kali-panel)_82%,transparent_18%)] accent-kali-accent"
                aria-labelledby="ssh-compression-label"
              />
              <span id="ssh-compression-label">Enable compression (-C)</span>
            </label>
            <label className="flex items-center space-x-2 text-sm">
              <input
                type="checkbox"
                checked={config.enableAgentForwarding}
                onChange={(event) => updateField('enableAgentForwarding', event.target.checked)}
                className="h-4 w-4 rounded border-[color:var(--kali-panel-border)] bg-[color:color-mix(in_srgb,var(--kali-panel)_82%,transparent_18%)] accent-kali-accent"
                aria-labelledby="ssh-agent-forward-label"
              />
              <span id="ssh-agent-forward-label">Forward SSH agent (-A)</span>
            </label>
          </fieldset>
          <div>
            <label id="ssh-extra-label" htmlFor="ssh-extra" className="mb-1 block text-sm font-medium">
              Extra options
            </label>
            <textarea
              id="ssh-extra"
              className="min-h-[4rem] w-full rounded border border-[color:var(--kali-panel-border)] bg-[color:color-mix(in_srgb,var(--kali-panel)_88%,transparent_12%)] p-2 text-[color:var(--color-text)] focus:border-kali-accent focus:outline-none focus:ring-1 focus:ring-kali-accent/40"
              value={config.extraOptions}
              onChange={(event) => updateField('extraOptions', event.target.value)}
              placeholder="-o StrictHostKeyChecking=accept-new"
              aria-labelledby="ssh-extra-label"
            />
            <p className="mt-1 text-xs text-[color:var(--color-text)]/60">
              Options are appended to the command. Separate multiple flags with spaces or new lines.
            </p>
          </div>
        </form>
        <section className="space-y-6">
          <div className="rounded-lg border border-[color:color-mix(in_srgb,var(--kali-panel-border)_85%,transparent_15%)] bg-[color:var(--kali-terminal)] p-4 shadow-lg shadow-black/30">
            <header className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-lg font-semibold">Command Preview</h2>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={handleCopy}
                  disabled={!isValid || command === 'ssh'}
                  className="rounded border border-kali-accent/60 bg-kali-accent/90 px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-kali-inverse transition hover:bg-kali-accent focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-kali-focus disabled:cursor-not-allowed disabled:border-kali-accent/20 disabled:bg-kali-accent/20 disabled:opacity-50"
                >
                  Copy command
                </button>
                <button
                  type="button"
                  onClick={handleExport}
                  disabled={!isValid || command === 'ssh'}
                  className="rounded border border-kali-accent/50 bg-transparent px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-kali-accent transition hover:bg-kali-accent/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-kali-focus disabled:cursor-not-allowed disabled:border-kali-accent/15 disabled:text-kali-accent/40 disabled:opacity-60"
                >
                  Export to file
                </button>
              </div>
            </header>
            <div className="mt-3 rounded-lg border border-[color:color-mix(in_srgb,var(--color-terminal)_35%,transparent)] bg-[color:color-mix(in_srgb,var(--kali-terminal)_90%,transparent_10%)] p-4">
              <pre className="max-h-48 overflow-auto text-sm leading-relaxed text-[color:var(--color-terminal)]" aria-live="polite">
                {isValid && command !== 'ssh' ? command : '# Fill in the form to generate a command'}
              </pre>
            </div>
            <div className="mt-3 flex flex-wrap gap-3 text-xs">
              {copyState === 'copied' && (
                <span className="rounded-full border border-kali-severity-low/45 bg-[color:color-mix(in_srgb,var(--color-severity-low)_16%,transparent)] px-3 py-1 font-semibold text-kali-severity-low">
                  Command copied to clipboard.
                </span>
              )}
              {copyState === 'error' && (
                <span className="rounded-full border border-kali-severity-high/45 bg-[color:color-mix(in_srgb,var(--color-severity-high)_16%,transparent)] px-3 py-1 font-semibold text-kali-severity-high">
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
                    className="rounded-lg border border-[color:var(--kali-panel-border)] bg-[color:color-mix(in_srgb,var(--kali-panel)_88%,transparent_12%)] p-4 shadow-lg shadow-black/30"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="text-sm font-semibold uppercase tracking-wide text-[color:var(--color-text)]">
                        {card.label}
                      </h3>
                      <span className={`rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-wide ${STATUS_STYLES[card.status]}`}>
                        {card.status}
                      </span>
                    </div>
                    <p className="mt-3 text-sm font-mono text-kali-accent">{card.value}</p>
                    <p className="mt-2 text-xs text-[color:var(--color-text)]/70">{card.context}</p>
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
                    className="rounded-lg border border-[color:color-mix(in_srgb,var(--color-terminal)_28%,var(--kali-panel-border)_72%)] bg-[color:color-mix(in_srgb,var(--kali-terminal)_92%,transparent_8%)] p-4 shadow-lg shadow-black/30"
                  >
                    <header className="flex flex-wrap items-center justify-between gap-2 text-xs text-[color:var(--color-text)]/70">
                      <span className="font-semibold uppercase tracking-wide">{entry.timestamp}</span>
                      <span className={`rounded-full border px-3 py-1 font-semibold uppercase tracking-wide ${STATUS_STYLES[entry.status]}`}>
                        {entry.status}
                      </span>
                    </header>
                    <div className="mt-3 rounded-lg border border-[color:color-mix(in_srgb,var(--color-terminal)_40%,transparent)] bg-[color:color-mix(in_srgb,var(--kali-terminal)_92%,transparent_8%)] p-3">
                      <pre className="overflow-auto text-[0.8rem] leading-relaxed text-[color:var(--color-terminal)]">
                        {entry.command}
                      </pre>
                    </div>
                    <p className="mt-3 text-sm text-[color:var(--color-text)]/80">{entry.narrative}</p>
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
                    className="rounded-lg border border-[color:var(--kali-panel-border)] bg-[color:color-mix(in_srgb,var(--kali-panel)_88%,transparent_12%)] p-4 shadow-lg shadow-black/30"
                  >
                    <header className="flex items-center justify-between gap-2">
                      <h3 className="text-base font-semibold text-[color:var(--color-text)]">{note.title}</h3>
                      <span className={`rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-wide ${SEVERITY_STYLES[note.severity]}`}>
                        {note.severity}
                      </span>
                    </header>
                    <p className="mt-2 text-sm text-[color:var(--color-text)]/80">{note.detail}</p>
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
      className="min-h-screen bg-[color:var(--kali-panel)] text-[color:var(--color-text)]"
      initialTabs={[createTab()]}
      onNewTab={createTab}
    />
  );
};

export default SSHPreview;
