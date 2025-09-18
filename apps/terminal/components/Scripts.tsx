'use client';

import { useMemo, useState } from 'react';
import usePersistentState from '../../../hooks/usePersistentState';
import runScript, { ScriptController } from '../utils/scriptRunner';
import Modal from '../../../components/base/Modal';
import { useOptionalShellConfig, type WarningPayload } from '../../../hooks/useShellConfig';

interface ScriptEntry {
  code: string;
  presets?: Record<string, string[]>;
}

const examplesHref = new URL(
  '../../../scripts/examples/terminal.ts',
  import.meta.url,
).href;

interface ScriptsProps {
  runCommand: (
    cmd: string,
    options?: { bypassConfirmation?: boolean },
  ) => Promise<boolean>;
}

const Scripts = ({ runCommand }: ScriptsProps) => {
  const [scripts, setScripts] =
    usePersistentState<Record<string, ScriptEntry | string>>(
      'terminal-scripts',
      {},
    );
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [controller, setController] = useState<ScriptController | null>(null);
  const [selectedPresets, setSelectedPresets] = useState<Record<string, string>>(
    {},
  );
  const shellConfig = useOptionalShellConfig();
  const redTeamMode = shellConfig?.redTeamMode ?? false;
  const captureEvidence = shellConfig?.captureEvidence ?? (() => null);
  const pushWarning =
    shellConfig?.pushWarning ??
    ((payload: WarningPayload) => ({
      id: `noop-${Date.now()}`,
      message: payload.message,
      severity: payload.severity ?? 'info',
      timestamp: payload.timestamp ?? Date.now(),
      context: payload.context,
    }));
  const [pendingScript, setPendingScript] = useState<
    { name: string; code: string; args: string[] } | null
  >(null);
  const pendingPreview = useMemo(
    () =>
      pendingScript
        ? pendingScript.code.split('\n').slice(0, 6).join('\n')
        : '',
    [pendingScript],
  );

  const save = () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    setScripts({
      ...scripts,
      [trimmed]: { code, presets: {} },
    });
    setName('');
    setCode('');
  };

  const executeScript = (payload: { name: string; code: string; args: string[] }) => {
    const ctrl = runScript(
      payload.code,
      (command) => runCommand(command, { bypassConfirmation: true }),
      payload.args,
    );
    setController(ctrl);
    ctrl.finished.finally(() => setController(null));
    if (redTeamMode) {
      captureEvidence({
        source: 'terminal-script',
        content: `Script "${payload.name}" executed`,
        tags: ['terminal', 'script'],
        metadata: {
          args: payload.args,
          preview: payload.code.slice(0, 200),
        },
      });
    }
  };

  const run = (n: string) => {
    const entry = scripts[n];
    if (!entry) return;
    const data: ScriptEntry =
      typeof entry === 'string' ? { code: entry } : entry;
    const preset = selectedPresets[n];
    let args: string[] = [];
    if (preset && data.presets?.[preset]) {
      args = data.presets[preset];
    } else {
      const input = window.prompt('Arguments (space-separated)?') || '';
      args = input.trim() ? input.trim().split(/\s+/) : [];
    }
    const details = { name: n, code: data.code, args };
    if (redTeamMode) {
      pushWarning({
        message: `Script "${n}" will run in red-team mode. Evidence capture enabled.`,
        severity: 'warning',
        context: { script: n },
      });
      setPendingScript(details);
      return;
    }
    executeScript(details);
  };

  const addPreset = (n: string) => {
    const entry = scripts[n];
    if (!entry) return;
    const data: ScriptEntry =
      typeof entry === 'string' ? { code: entry } : entry;
    const presetName = window.prompt('Preset name?');
    if (!presetName) return;
    const argStr = window.prompt('Arguments (space-separated)?') || '';
    const args = argStr.trim() ? argStr.trim().split(/\s+/) : [];
    const updated: ScriptEntry = {
      ...data,
      presets: { ...(data.presets || {}), [presetName]: args },
    };
    setScripts({ ...scripts, [n]: updated });
    setSelectedPresets({ ...selectedPresets, [n]: presetName });
  };

  const removePreset = (n: string, preset: string) => {
    const entry = scripts[n];
    if (!entry) return;
    const data: ScriptEntry =
      typeof entry === 'string' ? { code: entry } : entry;
    const presets = { ...(data.presets || {}) };
    delete presets[preset];
    const updated: ScriptEntry = { ...data, presets };
    setScripts({ ...scripts, [n]: updated });
    setSelectedPresets((p) => ({ ...p, [n]: '' }));
  };

  const cancel = () => controller?.cancel();

  const remove = (n: string) => {
    const updated = { ...scripts };
    delete updated[n];
    setScripts(updated);
    setSelectedPresets((p) => {
      const np = { ...p };
      delete np[n];
      return np;
    });
  };

  const confirmScriptRun = () => {
    if (!pendingScript) return;
    executeScript(pendingScript);
    setPendingScript(null);
  };

  const cancelScriptRun = () => {
    setPendingScript(null);
  };

  return (
    <div className="p-2 space-y-2 text-sm">
      <Modal isOpen={Boolean(pendingScript)} onClose={cancelScriptRun}>
        <div className="mx-auto mt-24 w-[min(90vw,26rem)] space-y-4 rounded-lg bg-gray-900 p-6 text-white shadow-xl">
          <h2 className="text-lg font-semibold text-red-300">Run automation script?</h2>
          <p className="text-sm text-red-100">
            Red-team mode will capture the script output and arguments as evidence.
          </p>
          <div className="space-y-2 text-xs">
            <div>
              <span className="font-semibold text-red-200">Script:</span>{' '}
              {pendingScript?.name}
            </div>
            <div>
              <span className="font-semibold text-red-200">Args:</span>{' '}
              {pendingScript?.args.length ? pendingScript?.args.join(' ') : 'none'}
            </div>
          </div>
          <pre className="max-h-40 overflow-y-auto rounded bg-black/60 p-3 text-xs text-red-200">
            {pendingPreview}
          </pre>
          <div className="flex justify-end gap-3">
            <button
              type="button"
              className="rounded bg-gray-700 px-3 py-1 text-sm hover:bg-gray-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-400"
              onClick={cancelScriptRun}
            >
              Cancel
            </button>
            <button
              type="button"
              className="rounded bg-red-600 px-3 py-1 text-sm font-semibold uppercase tracking-wide hover:bg-red-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-300"
              onClick={confirmScriptRun}
            >
              Run script
            </button>
          </div>
        </div>
      </Modal>
      <p className="text-xs">
        Need sample scripts?{' '}
        <a
          href={examplesHref}
          target="_blank"
          rel="noopener noreferrer"
          className="underline text-blue-400"
        >
          View examples
        </a>
        . Use <code>$1</code>, <code>$2</code>… in scripts for arguments.
      </p>
      <div className="space-y-1">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="script name"
          className="w-full border p-1"
        />
        <textarea
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder={"echo hello\nsleep 1000\necho done"}
          className="w-full border p-1 h-32"
        />
        <button
          onClick={save}
          className="bg-blue-500 text-white px-2 py-1 rounded"
        >
          Save
        </button>
        {controller && (
          <button
            onClick={cancel}
            className="ml-2 bg-red-500 text-white px-2 py-1 rounded"
          >
            Cancel
          </button>
        )}
      </div>
      <ul className="space-y-1">
        {Object.keys(scripts).map((n) => {
          const entry = scripts[n];
          const data: ScriptEntry =
            typeof entry === 'string' ? { code: entry } : entry;
          const presets = data.presets || {};
          return (
            <li key={n} className="flex items-center gap-2">
              <span className="flex-1 truncate">{n}</span>
              <select
                value={selectedPresets[n] || ''}
                onChange={(e) =>
                  setSelectedPresets({ ...selectedPresets, [n]: e.target.value })
                }
                className="border px-1 py-0.5"
              >
                <option value="">custom</option>
                {Object.keys(presets).map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
              <button
                onClick={() => run(n)}
                className="bg-green-600 text-white px-2 py-0.5 rounded"
              >
                Run
              </button>
              <button
                onClick={() => addPreset(n)}
                className="bg-blue-600 text-white px-2 py-0.5 rounded"
              >
                Add Preset
              </button>
              {selectedPresets[n] && presets[selectedPresets[n]] && (
                <button
                  onClick={() => removePreset(n, selectedPresets[n])}
                  className="bg-yellow-600 text-white px-2 py-0.5 rounded"
                >
                  Remove
                </button>
              )}
              <button
                onClick={() => remove(n)}
                className="bg-gray-600 text-white px-2 py-0.5 rounded"
              >
                Delete
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
};

export default Scripts;
