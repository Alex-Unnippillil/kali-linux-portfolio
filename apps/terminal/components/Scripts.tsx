'use client';

import { useState } from 'react';
import usePersistentState from '../../../hooks/usePersistentState';
import runScript, { ScriptController } from '../utils/scriptRunner';

interface ScriptEntry {
  code: string;
  presets?: Record<string, string[]>;
}

const examplesHref = new URL(
  '../../../scripts/examples/terminal.ts',
  import.meta.url,
).href;

interface ScriptsProps {
  runCommand: (cmd: string) => Promise<any> | any;
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
    const ctrl = runScript(data.code, runCommand, args);
    setController(ctrl);
    ctrl.finished.finally(() => setController(null));
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

  return (
    <div className="p-2 space-y-2 text-sm">
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
        {Object.entries(scripts).map(([n, entry]) => {
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
