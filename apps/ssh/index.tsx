'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import TabbedWindow, { TabDefinition } from '../../components/ui/TabbedWindow';
import { DEFAULT_SSH_CONFIG, SSH_PRESETS, type SSHConfig } from './config';
import { buildSSHCommand, buildSSHCommandParts, validateSSHConfig, type SSHCommandSegment } from './utils';

type CopyState = 'idle' | 'copied' | 'error';

type TimelineStep = {
  id: string;
  title: string;
  detail: string;
};

const PRESET_CUSTOM_ID = 'custom';

const HOST_KEY_POLICIES: Array<{ value: SSHConfig['strictHostKeyChecking']; label: string; helper: string }> = [
  { value: '', label: 'Default (ask)', helper: 'Prompt when a host key is new or changed.' },
  { value: 'accept-new', label: 'Accept new', helper: 'Automatically trust new host keys.' },
  { value: 'yes', label: 'Strict yes', helper: 'Reject unknown host keys.' },
  { value: 'no', label: 'Strict no', helper: 'Disable host key checking entirely.' },
  { value: 'ask', label: 'Ask every time', helper: 'Always prompt before writing host keys.' },
];

const LOG_LEVEL_OPTIONS: Array<{ value: SSHConfig['logLevel']; label: string }> = [
  { value: '', label: 'Default' },
  { value: 'QUIET', label: 'QUIET' },
  { value: 'FATAL', label: 'FATAL' },
  { value: 'ERROR', label: 'ERROR' },
  { value: 'INFO', label: 'INFO' },
  { value: 'VERBOSE', label: 'VERBOSE' },
  { value: 'DEBUG', label: 'DEBUG' },
  { value: 'DEBUG1', label: 'DEBUG1' },
  { value: 'DEBUG2', label: 'DEBUG2' },
  { value: 'DEBUG3', label: 'DEBUG3' },
];

const CommandPreviewPanel: React.FC<{
  command: string;
  previewCommand: string;
  isReady: boolean;
  copyState: CopyState;
  onCopy: () => void;
  onExportCommand: () => void;
  onExportConfig: () => void;
}> = ({ command, previewCommand, isReady, copyState, onCopy, onExportCommand, onExportConfig }) => {
  const statusMessage =
    copyState === 'copied'
      ? 'Command copied to clipboard.'
      : copyState === 'error'
        ? 'Clipboard unavailable. Try manual copy.'
        : '';

  return (
    <section className="rounded-2xl border border-kali-primary/30 bg-[var(--kali-panel)] shadow-lg">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-kali-primary/20 px-6 py-4">
        <div>
          <span className="inline-flex items-center rounded-full border border-kali-primary/40 bg-kali-primary/10 px-2 py-0.5 text-[0.6rem] font-semibold uppercase tracking-[0.28em] text-kali-primary">
            Preview
          </span>
          <h2 className="mt-2 text-base font-semibold text-kali-primary">Command preview</h2>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={onCopy}
            disabled={!isReady}
            className="rounded border border-kali-accent/60 bg-kali-accent/90 px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-kali-inverse transition hover:bg-kali-accent focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-kali-focus disabled:cursor-not-allowed disabled:border-kali-accent/20 disabled:bg-kali-accent/20 disabled:opacity-50"
          >
            Copy command
          </button>
          <button
            type="button"
            onClick={onExportCommand}
            disabled={!isReady}
            className="rounded border border-kali-accent/50 bg-transparent px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-kali-accent transition hover:bg-kali-accent/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-kali-focus disabled:cursor-not-allowed disabled:border-kali-accent/15 disabled:text-kali-accent/40 disabled:opacity-60"
          >
            Export command
          </button>
          <button
            type="button"
            onClick={onExportConfig}
            className="rounded border border-kali-primary/50 bg-transparent px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-kali-primary transition hover:bg-kali-primary/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-kali-focus"
          >
            Export config
          </button>
        </div>
      </header>
      <div className="px-6 pb-6 pt-5">
        <div className="rounded-lg border border-[color:color-mix(in_srgb,var(--color-terminal)_35%,transparent)] bg-[color:color-mix(in_srgb,var(--kali-terminal)_90%,transparent_10%)] p-4">
          <pre
            className="max-h-48 overflow-auto text-sm leading-relaxed text-[color:var(--color-terminal)]"
            aria-live="polite"
            aria-label="SSH command preview"
          >
            {isReady ? command : previewCommand || 'ssh <host>'}
          </pre>
        </div>
        <div className="mt-3 min-h-[1.5rem] text-xs" role="status" aria-live="polite">
          {statusMessage && (
            <span
              className={`inline-flex rounded-full border px-3 py-1 font-semibold ${
                copyState === 'copied'
                  ? 'border-kali-severity-low/45 bg-[color:color-mix(in_srgb,var(--color-severity-low)_16%,transparent)] text-kali-severity-low'
                  : 'border-kali-severity-high/45 bg-[color:color-mix(in_srgb,var(--color-severity-high)_16%,transparent)] text-kali-severity-high'
              }`}
            >
              {statusMessage}
            </span>
          )}
        </div>
      </div>
    </section>
  );
};

const CommandBreakdownPanel: React.FC<{ segments: SSHCommandSegment[] }> = ({ segments }) => (
  <section className="rounded-2xl border border-kali-primary/30 bg-[var(--kali-panel)] shadow-lg">
    <header className="border-b border-kali-primary/20 px-6 py-4">
      <span className="inline-flex items-center rounded-full border border-kali-primary/40 bg-kali-primary/10 px-2 py-0.5 text-[0.6rem] font-semibold uppercase tracking-[0.28em] text-kali-primary">
        Breakdown
      </span>
      <h2 className="mt-2 text-base font-semibold text-kali-primary">Command breakdown</h2>
      <p className="mt-2 text-xs text-kali-text text-opacity-70">
        Each flag is explained so you can audit the command before using it.
      </p>
    </header>
    <div className="space-y-3 px-6 pb-6 pt-5">
      {segments.map((segment) => (
        <article
          key={segment.id}
          className="rounded-lg border border-kali-primary/20 bg-[color:color-mix(in_srgb,var(--kali-panel)_88%,transparent_12%)] p-4"
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-sm font-semibold text-kali-primary">{segment.label}</h3>
            {segment.isPlaceholder && (
              <span className="rounded-full border border-kali-severity-medium/50 bg-kali-severity-medium/10 px-2 py-0.5 text-[0.6rem] font-semibold uppercase tracking-wide text-kali-severity-medium">
                Required
              </span>
            )}
          </div>
          <p className="mt-2 text-xs text-kali-text text-opacity-70">{segment.description}</p>
          <div className="mt-3 rounded-md border border-[color:color-mix(in_srgb,var(--color-terminal)_35%,transparent)] bg-[color:color-mix(in_srgb,var(--kali-terminal)_88%,transparent_12%)] px-3 py-2">
            <span className="font-mono text-xs text-[color:var(--color-terminal)]">{segment.segment}</span>
          </div>
        </article>
      ))}
    </div>
  </section>
);

const SafetyNotesPanel: React.FC = () => (
  <section className="rounded-2xl border border-kali-primary/30 bg-[var(--kali-panel)] shadow-lg">
    <header className="border-b border-kali-primary/20 px-6 py-4">
      <span className="inline-flex items-center rounded-full border border-kali-primary/40 bg-kali-primary/10 px-2 py-0.5 text-[0.6rem] font-semibold uppercase tracking-[0.28em] text-kali-primary">
        Safety
      </span>
      <h2 className="mt-2 text-base font-semibold text-kali-primary">Safety & notes</h2>
    </header>
    <div className="space-y-3 px-6 pb-6 pt-5 text-sm text-kali-text text-opacity-80">
      <p>Only connect to systems you own or have explicit authorization to access.</p>
      <p>
        This builder never initiates connections; it only assembles a command for review.
      </p>
    </div>
  </section>
);

const TimelinePanel: React.FC<{ steps: TimelineStep[] }> = ({ steps }) => (
  <section className="rounded-2xl border border-kali-primary/30 bg-[var(--kali-panel)] shadow-lg">
    <header className="border-b border-kali-primary/20 px-6 py-4">
      <span className="inline-flex items-center rounded-full border border-kali-primary/40 bg-kali-primary/10 px-2 py-0.5 text-[0.6rem] font-semibold uppercase tracking-[0.28em] text-kali-primary">
        Timeline
      </span>
      <h2 className="mt-2 text-base font-semibold text-kali-primary">Compose → Options → Ready</h2>
    </header>
    <ol className="space-y-4 px-6 pb-6 pt-5">
      {steps.map((step, index) => (
        <li key={step.id} className="flex gap-3">
          <div className="flex flex-col items-center">
            <span className="flex h-6 w-6 items-center justify-center rounded-full border border-kali-primary/40 bg-kali-primary/10 text-[0.65rem] font-semibold text-kali-primary">
              {index + 1}
            </span>
            {index < steps.length - 1 && (
              <span className="mt-1 h-full w-px bg-kali-primary/30" />
            )}
          </div>
          <div>
            <h3 className="text-sm font-semibold text-kali-primary">{step.title}</h3>
            <p className="mt-1 text-xs text-kali-text text-opacity-70">{step.detail}</p>
          </div>
        </li>
      ))}
    </ol>
  </section>
);

export const SSHBuilder: React.FC = () => {
  const [config, setConfig] = useState<SSHConfig>(DEFAULT_SSH_CONFIG);
  const [selectedPreset, setSelectedPreset] = useState<string>(PRESET_CUSTOM_ID);
  const [copyState, setCopyState] = useState<CopyState>('idle');

  const validationErrors = useMemo(() => validateSSHConfig(config), [config]);
  const isValid = useMemo(() => Object.keys(validationErrors).length === 0, [validationErrors]);
  const command = useMemo(() => buildSSHCommand(config), [config]);
  const previewParts = useMemo(() => buildSSHCommandParts(config, { includePlaceholder: true }), [config]);
  const previewCommand = useMemo(
    () => previewParts.segments.map((segment) => segment.segment).join(' '),
    [previewParts]
  );

  const breakdownSegments = useMemo(
    () => previewParts.segments.filter((segment) => segment.kind !== 'command'),
    [previewParts]
  );

  useEffect(() => {
    if (copyState === 'idle') {
      return;
    }
    const timer = window.setTimeout(() => setCopyState('idle'), 2400);
    return () => window.clearTimeout(timer);
  }, [copyState]);

  const markCustom = useCallback(() => {
    setSelectedPreset((current) => (current === PRESET_CUSTOM_ID ? current : PRESET_CUSTOM_ID));
  }, []);

  const updateField = useCallback(
    <Key extends keyof SSHConfig>(key: Key, value: SSHConfig[Key]) => {
      markCustom();
      setConfig((current) => ({ ...current, [key]: value }));
      setCopyState('idle');
    },
    [markCustom]
  );

  const applyPreset = useCallback((presetId: string) => {
    setSelectedPreset(presetId);
    const preset = SSH_PRESETS.find((item) => item.id === presetId);
    if (preset) {
      setConfig({ ...preset.config });
    } else {
      setConfig({ ...DEFAULT_SSH_CONFIG });
    }
    setCopyState('idle');
  }, []);

  const handleReset = useCallback(() => {
    setConfig({ ...DEFAULT_SSH_CONFIG });
    setSelectedPreset(PRESET_CUSTOM_ID);
    setCopyState('idle');
  }, []);

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

  const handleExportCommand = () => {
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

  const handleExportConfig = () => {
    const blob = new Blob([JSON.stringify(config, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'ssh-config.json';
    anchor.click();
    URL.revokeObjectURL(url);
    setCopyState('idle');
  };

  const timelineSteps = useMemo<TimelineStep[]>(() => {
    const target = config.host.trim() || '<host>';
    const authSummary = config.identityFile.trim() ? 'Identity file loaded' : 'Default SSH identity';
    const optionSummary = [
      config.useCompression ? 'Compression enabled' : 'No compression',
      config.enableAgentForwarding ? 'Agent forwarding on' : 'Agent forwarding off',
      config.jumpHost.trim() ? `Jump via ${config.jumpHost.trim()}` : 'Direct connection',
    ].join(' · ');

    return [
      {
        id: 'compose',
        title: 'Compose destination',
        detail: `${config.user.trim() ? `${config.user.trim()}@` : ''}${target}`,
      },
      {
        id: 'auth',
        title: 'Authentication prep',
        detail: authSummary,
      },
      {
        id: 'options',
        title: 'Session options',
        detail: optionSummary,
      },
      {
        id: 'ready',
        title: 'Ready to launch',
        detail: 'Review the command and run it manually on an authorized system.',
      },
    ];
  }, [config]);

  const isCommandReady = isValid && command.trim().length > 0 && command !== 'ssh';

  const selectedPresetDescription =
    SSH_PRESETS.find((preset) => preset.id === selectedPreset)?.description ?? '';

  return (
    <div className="h-full overflow-auto bg-kali-background p-6 text-kali-text">
      <header className="mb-6 space-y-3">
        <span className="inline-flex items-center rounded-full border border-kali-primary/40 bg-kali-primary/10 px-3 py-1 text-[0.65rem] font-semibold uppercase tracking-[0.28em] text-kali-primary">
          SSH Builder
        </span>
        <h1 className="text-2xl font-semibold">SSH Command Builder</h1>
        <p className="text-sm text-kali-text text-opacity-70">
          Generate an SSH command without executing it. Learn more at{' '}
          <a
            href="https://www.openssh.com/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-kali-primary underline decoration-dotted underline-offset-4 hover:opacity-80"
          >
            the OpenSSH project page
          </a>
          .
        </p>
      </header>
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
        <section className="rounded-2xl border border-kali-primary/30 bg-[var(--kali-panel)] shadow-lg">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-kali-primary/20 px-6 py-4">
            <div className="flex items-center gap-3">
              <span className="inline-flex items-center rounded-full border border-kali-primary/40 bg-kali-primary/10 px-2 py-0.5 text-[0.6rem] font-semibold uppercase tracking-[0.28em] text-kali-primary">
                Builder
              </span>
              <h2 className="text-sm font-semibold text-kali-primary">Compose simulated SSH sessions</h2>
            </div>
            <button
              type="button"
              onClick={handleReset}
              className="rounded border border-kali-primary/50 px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-kali-primary transition hover:bg-kali-primary/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-kali-focus"
            >
              Reset defaults
            </button>
          </div>
          <form onSubmit={(event) => event.preventDefault()} className="space-y-6 px-6 pb-6 pt-5">
            <div>
              <label htmlFor="ssh-preset" className="text-xs font-semibold uppercase tracking-wide text-kali-text text-opacity-80">
                Preset workflow
              </label>
              <select
                id="ssh-preset"
                value={selectedPreset}
                onChange={(event) => applyPreset(event.target.value)}
                className="mt-2 w-full rounded border border-kali-primary/30 bg-[color:color-mix(in_srgb,var(--kali-panel)_82%,transparent_18%)] p-2 text-sm text-kali-text focus:border-kali-accent focus:outline-none focus:ring-1 focus:ring-kali-accent/40"
              >
                {SSH_PRESETS.map((preset) => (
                  <option key={preset.id} value={preset.id}>
                    {preset.label}
                  </option>
                ))}
              </select>
              {selectedPresetDescription && (
                <p className="mt-2 text-xs text-kali-text text-opacity-60">{selectedPresetDescription}</p>
              )}
            </div>

            <section className="space-y-4">
              <div>
                <h3 className="text-sm font-semibold text-kali-primary">Connection target</h3>
                <p className="text-xs text-kali-text text-opacity-60">
                  Define the remote host and optional account used for the session.
                </p>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label id="ssh-user-label" htmlFor="ssh-user" className="mb-1 block text-sm font-medium">
                    Username
                  </label>
                  <input
                    id="ssh-user"
                    type="text"
                    className="w-full rounded border border-kali-primary/30 bg-[color:color-mix(in_srgb,var(--kali-panel)_88%,transparent_12%)] p-2 text-kali-text focus:border-kali-accent focus:outline-none focus:ring-1 focus:ring-kali-accent/40"
                    value={config.user}
                    onChange={(event) => updateField('user', event.target.value)}
                    autoComplete="username"
                    aria-labelledby="ssh-user-label"
                  />
                  {validationErrors.user && (
                    <p className="mt-1 text-xs text-kali-severity-high">{validationErrors.user}</p>
                  )}
                </div>
                <div>
                  <label id="ssh-host-label" htmlFor="ssh-host" className="mb-1 block text-sm font-medium">
                    Host <span className="text-kali-severity-high">*</span>
                  </label>
                  <input
                    id="ssh-host"
                    type="text"
                    className="w-full rounded border border-kali-primary/30 bg-[color:color-mix(in_srgb,var(--kali-panel)_88%,transparent_12%)] p-2 text-kali-text focus:border-kali-accent focus:outline-none focus:ring-1 focus:ring-kali-accent/40"
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
                    className="w-full rounded border border-kali-primary/30 bg-[color:color-mix(in_srgb,var(--kali-panel)_88%,transparent_12%)] p-2 text-kali-text focus:border-kali-accent focus:outline-none focus:ring-1 focus:ring-kali-accent/40"
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
                    className="w-full rounded border border-kali-primary/30 bg-[color:color-mix(in_srgb,var(--kali-panel)_88%,transparent_12%)] p-2 text-kali-text focus:border-kali-accent focus:outline-none focus:ring-1 focus:ring-kali-accent/40"
                    value={config.identityFile}
                    onChange={(event) => updateField('identityFile', event.target.value)}
                    placeholder="~/.ssh/id_ed25519"
                    aria-labelledby="ssh-identity-label"
                  />
                  {validationErrors.identityFile && (
                    <p className="mt-1 text-xs text-kali-severity-high">{validationErrors.identityFile}</p>
                  )}
                </div>
              </div>
            </section>

            <section className="space-y-4">
              <div>
                <h3 className="text-sm font-semibold text-kali-primary">Session behavior</h3>
                <p className="text-xs text-kali-text text-opacity-60">
                  Toggle common SSH switches used during interactive sessions.
                </p>
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                <label className="flex items-center space-x-2 text-sm">
                  <input
                    type="checkbox"
                    checked={config.useCompression}
                    onChange={(event) => updateField('useCompression', event.target.checked)}
                    className="h-4 w-4 rounded border-kali-primary/40 bg-[color:color-mix(in_srgb,var(--kali-panel)_82%,transparent_18%)] accent-kali-accent"
                    aria-labelledby="ssh-compression-label"
                  />
                  <span id="ssh-compression-label">Enable compression (-C)</span>
                </label>
                <label className="flex items-center space-x-2 text-sm">
                  <input
                    type="checkbox"
                    checked={config.enableAgentForwarding}
                    onChange={(event) => updateField('enableAgentForwarding', event.target.checked)}
                    className="h-4 w-4 rounded border-kali-primary/40 bg-[color:color-mix(in_srgb,var(--kali-panel)_82%,transparent_18%)] accent-kali-accent"
                    aria-labelledby="ssh-agent-forward-label"
                  />
                  <span id="ssh-agent-forward-label">Forward SSH agent (-A)</span>
                </label>
                <label className="flex items-center space-x-2 text-sm">
                  <input
                    type="checkbox"
                    checked={config.allocateTTY}
                    onChange={(event) => updateField('allocateTTY', event.target.checked)}
                    className="h-4 w-4 rounded border-kali-primary/40 bg-[color:color-mix(in_srgb,var(--kali-panel)_82%,transparent_18%)] accent-kali-accent"
                    aria-labelledby="ssh-tty-label"
                  />
                  <span id="ssh-tty-label">Force TTY allocation (-t)</span>
                </label>
              </div>
            </section>

            <section className="space-y-4">
              <div>
                <h3 className="text-sm font-semibold text-kali-primary">Routing & jump hosts</h3>
                <p className="text-xs text-kali-text text-opacity-60">
                  Add a bastion host to route traffic through before reaching the target.
                </p>
              </div>
              <div>
                <label id="ssh-jump-label" htmlFor="ssh-jump" className="mb-1 block text-sm font-medium">
                  Jump host (-J)
                </label>
                <input
                  id="ssh-jump"
                  type="text"
                  className="w-full rounded border border-kali-primary/30 bg-[color:color-mix(in_srgb,var(--kali-panel)_88%,transparent_12%)] p-2 text-kali-text focus:border-kali-accent focus:outline-none focus:ring-1 focus:ring-kali-accent/40"
                  value={config.jumpHost}
                  onChange={(event) => updateField('jumpHost', event.target.value)}
                  placeholder="bastion.example.com:22"
                  aria-labelledby="ssh-jump-label"
                />
                {validationErrors.jumpHost && (
                  <p className="mt-1 text-xs text-kali-severity-high">{validationErrors.jumpHost}</p>
                )}
              </div>
            </section>

            <section className="space-y-4">
              <div>
                <h3 className="text-sm font-semibold text-kali-primary">Hardening options</h3>
                <p className="text-xs text-kali-text text-opacity-60">
                  Map common -o settings to prevent mistakes and keep sessions resilient.
                </p>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label htmlFor="ssh-host-key" className="mb-1 block text-sm font-medium">
                    StrictHostKeyChecking
                  </label>
                  <select
                    id="ssh-host-key"
                    value={config.strictHostKeyChecking}
                    onChange={(event) => updateField('strictHostKeyChecking', event.target.value as SSHConfig['strictHostKeyChecking'])}
                    className="w-full rounded border border-kali-primary/30 bg-[color:color-mix(in_srgb,var(--kali-panel)_82%,transparent_18%)] p-2 text-sm text-kali-text focus:border-kali-accent focus:outline-none focus:ring-1 focus:ring-kali-accent/40"
                  >
                    {HOST_KEY_POLICIES.map((option) => (
                      <option key={option.value || 'default'} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                  <p className="mt-2 text-xs text-kali-text text-opacity-60">
                    {HOST_KEY_POLICIES.find((option) => option.value === config.strictHostKeyChecking)?.helper}
                  </p>
                </div>
                <div>
                  <label htmlFor="ssh-log-level" className="mb-1 block text-sm font-medium">
                    LogLevel
                  </label>
                  <select
                    id="ssh-log-level"
                    value={config.logLevel}
                    onChange={(event) => updateField('logLevel', event.target.value as SSHConfig['logLevel'])}
                    className="w-full rounded border border-kali-primary/30 bg-[color:color-mix(in_srgb,var(--kali-panel)_82%,transparent_18%)] p-2 text-sm text-kali-text focus:border-kali-accent focus:outline-none focus:ring-1 focus:ring-kali-accent/40"
                  >
                    {LOG_LEVEL_OPTIONS.map((option) => (
                      <option key={option.value || 'default'} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label id="ssh-alive-interval-label" htmlFor="ssh-alive-interval" className="mb-1 block text-sm font-medium">
                    ServerAliveInterval
                  </label>
                  <input
                    id="ssh-alive-interval"
                    type="number"
                    min={1}
                    placeholder="60"
                    className="w-full rounded border border-kali-primary/30 bg-[color:color-mix(in_srgb,var(--kali-panel)_88%,transparent_12%)] p-2 text-kali-text focus:border-kali-accent focus:outline-none focus:ring-1 focus:ring-kali-accent/40"
                    value={config.serverAliveInterval}
                    onChange={(event) => updateField('serverAliveInterval', event.target.value)}
                    aria-labelledby="ssh-alive-interval-label"
                  />
                  {validationErrors.serverAliveInterval && (
                    <p className="mt-1 text-xs text-kali-severity-high">{validationErrors.serverAliveInterval}</p>
                  )}
                </div>
                <div>
                  <label id="ssh-alive-count-label" htmlFor="ssh-alive-count" className="mb-1 block text-sm font-medium">
                    ServerAliveCountMax
                  </label>
                  <input
                    id="ssh-alive-count"
                    type="number"
                    min={1}
                    placeholder="3"
                    className="w-full rounded border border-kali-primary/30 bg-[color:color-mix(in_srgb,var(--kali-panel)_88%,transparent_12%)] p-2 text-kali-text focus:border-kali-accent focus:outline-none focus:ring-1 focus:ring-kali-accent/40"
                    value={config.serverAliveCountMax}
                    onChange={(event) => updateField('serverAliveCountMax', event.target.value)}
                    aria-labelledby="ssh-alive-count-label"
                  />
                  {validationErrors.serverAliveCountMax && (
                    <p className="mt-1 text-xs text-kali-severity-high">{validationErrors.serverAliveCountMax}</p>
                  )}
                </div>
                <div className="md:col-span-2">
                  <label id="ssh-known-hosts-label" htmlFor="ssh-known-hosts" className="mb-1 block text-sm font-medium">
                    UserKnownHostsFile
                  </label>
                  <input
                    id="ssh-known-hosts"
                    type="text"
                    placeholder="~/.ssh/known_hosts"
                    className="w-full rounded border border-kali-primary/30 bg-[color:color-mix(in_srgb,var(--kali-panel)_88%,transparent_12%)] p-2 text-kali-text focus:border-kali-accent focus:outline-none focus:ring-1 focus:ring-kali-accent/40"
                    value={config.userKnownHostsFile}
                    onChange={(event) => updateField('userKnownHostsFile', event.target.value)}
                    aria-labelledby="ssh-known-hosts-label"
                  />
                </div>
              </div>
            </section>

            <section className="space-y-4">
              <div>
                <h3 className="text-sm font-semibold text-kali-primary">Extra options</h3>
                <p className="text-xs text-kali-text text-opacity-60">
                  Add any additional flags (one per line). They will remain before the destination host.
                </p>
              </div>
              <div>
                <label id="ssh-extra-label" htmlFor="ssh-extra" className="mb-1 block text-sm font-medium">
                  Extra options
                </label>
                <textarea
                  id="ssh-extra"
                  className="min-h-[4rem] w-full rounded border border-kali-primary/30 bg-[color:color-mix(in_srgb,var(--kali-panel)_88%,transparent_12%)] p-2 text-kali-text focus:border-kali-accent focus:outline-none focus:ring-1 focus:ring-kali-accent/40"
                  value={config.extraOptions}
                  onChange={(event) => updateField('extraOptions', event.target.value)}
                  placeholder="-o StrictHostKeyChecking=accept-new"
                  aria-labelledby="ssh-extra-label"
                />
              </div>
            </section>
          </form>
        </section>

        <div className="space-y-6">
          <CommandPreviewPanel
            command={command}
            previewCommand={previewCommand}
            isReady={isCommandReady}
            copyState={copyState}
            onCopy={handleCopy}
            onExportCommand={handleExportCommand}
            onExportConfig={handleExportConfig}
          />
          <CommandBreakdownPanel segments={breakdownSegments} />
          <TimelinePanel steps={timelineSteps} />
          <SafetyNotesPanel />
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
      className="min-h-screen bg-[color:var(--kali-panel)] text-[color:var(--color-text)]"
      initialTabs={[createTab()]}
      onNewTab={createTab}
    />
  );
};

export default SSHPreview;
