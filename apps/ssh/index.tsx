'use client';

import React, { useMemo, useRef, useState } from 'react';
import TabbedWindow, { TabDefinition } from '../../components/ui/TabbedWindow';
import { DEFAULT_SSH_CONFIG, SSH_PRESETS, type SSHConfig } from './config';
import { buildSSHCommand, validateSSHConfig } from './utils';

type CopyState = 'idle' | 'copied' | 'error';

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
      <div className="mb-6 rounded border border-gray-700 bg-gray-800 p-4">
        <label htmlFor="ssh-preset" className="mb-2 block text-sm font-semibold uppercase tracking-wide">
          Preset library
        </label>
        <select
          id="ssh-preset"
          value={selectedPreset}
          onChange={(event) => applyPreset(event.target.value)}
          className="w-full rounded border border-gray-700 bg-gray-800 p-2 text-white"
        >
          <option value="">Custom configuration</option>
          {SSH_PRESETS.map((preset) => (
            <option key={preset.id} value={preset.id}>
              {preset.label}
            </option>
          ))}
        </select>
        {selectedPreset && (
          <p className="mt-2 text-xs text-gray-300">
            {SSH_PRESETS.find((preset) => preset.id === selectedPreset)?.description}
          </p>
        )}
      </div>
      <form onSubmit={(event) => event.preventDefault()} className="mb-4 space-y-4">
        <div>
          <label htmlFor="ssh-user" className="mb-1 block text-sm font-medium">
            Username
          </label>
          <input
            id="ssh-user"
            type="text"
            className="w-full rounded border border-gray-700 bg-gray-800 p-2 text-white"
            value={config.user}
            onChange={(event) => updateField('user', event.target.value)}
            autoComplete="username"
          />
        </div>
        <div>
          <label htmlFor="ssh-host" className="mb-1 block text-sm font-medium">
            Host <span className="text-red-400">*</span>
          </label>
          <input
            id="ssh-host"
            type="text"
            className="w-full rounded border border-gray-700 bg-gray-800 p-2 text-white"
            value={config.host}
            onChange={(event) => updateField('host', event.target.value)}
            placeholder="server.example.com"
            required
            aria-invalid={validationErrors.host ? 'true' : 'false'}
            aria-describedby={validationErrors.host ? 'ssh-host-error' : undefined}
          />
          {validationErrors.host && (
            <p id="ssh-host-error" className="mt-1 text-xs text-red-400">
              {validationErrors.host}
            </p>
          )}
        </div>
        <div>
          <label htmlFor="ssh-port" className="mb-1 block text-sm font-medium">
            Port
          </label>
          <input
            id="ssh-port"
            type="number"
            className="w-full rounded border border-gray-700 bg-gray-800 p-2 text-white"
            value={config.port}
            onChange={(event) => updateField('port', event.target.value)}
            min={1}
            max={65535}
            placeholder="22"
            aria-invalid={validationErrors.port ? 'true' : 'false'}
            aria-describedby={validationErrors.port ? 'ssh-port-error' : undefined}
          />
          {validationErrors.port && (
            <p id="ssh-port-error" className="mt-1 text-xs text-red-400">
              {validationErrors.port}
            </p>
          )}
        </div>
        <div>
          <label htmlFor="ssh-identity" className="mb-1 block text-sm font-medium">
            Identity file
          </label>
          <input
            id="ssh-identity"
            type="text"
            className="w-full rounded border border-gray-700 bg-gray-800 p-2 text-white"
            value={config.identityFile}
            onChange={(event) => updateField('identityFile', event.target.value)}
            placeholder="~/.ssh/id_ed25519"
          />
        </div>
        <fieldset className="space-y-2">
          <legend className="text-sm font-medium">Session options</legend>
          <label className="flex items-center space-x-2 text-sm">
            <input
              type="checkbox"
              checked={config.useCompression}
              onChange={(event) => updateField('useCompression', event.target.checked)}
              className="h-4 w-4 rounded border-gray-700 bg-gray-800"
            />
            <span>Enable compression (-C)</span>
          </label>
          <label className="flex items-center space-x-2 text-sm">
            <input
              type="checkbox"
              checked={config.enableAgentForwarding}
              onChange={(event) => updateField('enableAgentForwarding', event.target.checked)}
              className="h-4 w-4 rounded border-gray-700 bg-gray-800"
            />
            <span>Forward SSH agent (-A)</span>
          </label>
        </fieldset>
        <div>
          <label htmlFor="ssh-extra" className="mb-1 block text-sm font-medium">
            Extra options
          </label>
          <textarea
            id="ssh-extra"
            className="min-h-[4rem] w-full rounded border border-gray-700 bg-gray-800 p-2 text-white"
            value={config.extraOptions}
            onChange={(event) => updateField('extraOptions', event.target.value)}
            placeholder="-o StrictHostKeyChecking=accept-new"
          />
          <p className="mt-1 text-xs text-gray-400">
            Options are appended to the command. Separate multiple flags with spaces or new lines.
          </p>
        </div>
      </form>
      <div>
        <h2 className="mb-2 text-lg">Command Preview</h2>
        <div className="rounded border border-gray-700 bg-black p-2">
          <pre className="overflow-auto font-mono text-green-400" aria-live="polite">
            {isValid && command !== 'ssh' ? command : '# Fill in the form to generate a command'}
          </pre>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={handleCopy}
            disabled={!isValid || command === 'ssh'}
            className="rounded bg-blue-600 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-500 disabled:cursor-not-allowed disabled:bg-blue-800"
          >
            Copy command
          </button>
          <button
            type="button"
            onClick={handleExport}
            disabled={!isValid || command === 'ssh'}
            className="rounded bg-teal-600 px-3 py-2 text-sm font-semibold text-white hover:bg-teal-500 disabled:cursor-not-allowed disabled:bg-teal-800"
          >
            Export to file
          </button>
          {copyState === 'copied' && (
            <span className="self-center text-xs text-green-400">Command copied to clipboard.</span>
          )}
          {copyState === 'error' && (
            <span className="self-center text-xs text-red-400">Clipboard unavailable. Try manual copy.</span>
          )}
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
