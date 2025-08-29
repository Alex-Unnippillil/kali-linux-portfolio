'use client';

import { useState } from 'react';
import usePersistentState from '../../../hooks/usePersistentState';
import runScript, { ScriptController } from '../utils/scriptRunner';

interface ScriptsProps {
  runCommand: (cmd: string) => Promise<any> | any;
}

const Scripts = ({ runCommand }: ScriptsProps) => {
  const [scripts, setScripts] = usePersistentState<Record<string, string>>(
    'terminal-scripts',
    {},
  );
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [controller, setController] = useState<ScriptController | null>(null);

  const save = () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    setScripts({ ...scripts, [trimmed]: code });
    setName('');
    setCode('');
  };

  const run = (n: string) => {
    const content = scripts[n];
    if (!content) return;
    const ctrl = runScript(content, runCommand);
    setController(ctrl);
    ctrl.finished.finally(() => setController(null));
  };

  const cancel = () => controller?.cancel();

  const remove = (n: string) => {
    const updated = { ...scripts };
    delete updated[n];
    setScripts(updated);
  };

  return (
    <div className="p-2 space-y-2 text-sm">
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
        {Object.keys(scripts).map((n) => (
          <li key={n} className="flex items-center gap-2">
            <span className="flex-1 truncate">{n}</span>
            <button
              onClick={() => run(n)}
              className="bg-green-600 text-white px-2 py-0.5 rounded"
            >
              Run
            </button>
            <button
              onClick={() => remove(n)}
              className="bg-gray-600 text-white px-2 py-0.5 rounded"
            >
              Delete
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default Scripts;
