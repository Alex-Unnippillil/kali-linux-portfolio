import { useEffect, useState, useCallback } from 'react';
import TerminalOutput from './TerminalOutput';
import usePersistentState from '../hooks/usePersistentState';
import useKeymap from '../apps/settings/keymapRegistry';

interface BuilderProps {
  doc: string;
  build: (params: Record<string, string>) => string;
  openApp?: (id: string) => void;
}

export default function CommandBuilder({ doc, build, openApp }: BuilderProps) {
  const [params, setParams] = useState<Record<string, string>>({});
  const [runInTerminal, setRunInTerminal] = usePersistentState<boolean>(
    'command-builder:run-terminal',
    false,
    (v): v is boolean => typeof v === 'boolean',
  );
  const { shortcuts } = useKeymap();
  const runShortcut =
    shortcuts.find((s) => s.description === 'Run in Terminal')?.keys ||
    'Ctrl+Enter';

  const update = (key: string) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setParams({ ...params, [key]: e.target.value });
  };

  const command = build(params);

  const run = useCallback(() => {
    if (!openApp) return;
    openApp('terminal');
    setTimeout(() => {
      window.dispatchEvent(
        new CustomEvent('terminal-run', { detail: command })
      );
    }, 100);
  }, [openApp, command]);

  useEffect(() => {
    if (!runInTerminal) return;
    const parts = runShortcut.split('+');
    const key = parts.pop() || '';
    const handler = (e: KeyboardEvent) => {
      const match =
        e.key.toLowerCase() === key.toLowerCase() &&
        (!parts.includes('Ctrl') || e.ctrlKey) &&
        (!parts.includes('Alt') || e.altKey) &&
        (!parts.includes('Shift') || e.shiftKey) &&
        (!parts.includes('Meta') || e.metaKey);
      if (match) {
        e.preventDefault();
        run();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [runInTerminal, runShortcut, run]);

  return (
    <form className="text-xs" onSubmit={(e) => e.preventDefault()} aria-label="command builder">
      <p className="mb-2" aria-label="inline docs">{doc}</p>
      <label className="block mb-1">
        <span className="mr-1">Target</span>
        <input
          aria-label="target"
          value={params.target || ''}
          onChange={update('target')}
          className="border p-1 text-black w-full"
        />
      </label>
      <label className="block mb-1">
        <span className="mr-1">Options</span>
        <input
          aria-label="options"
          value={params.opts || ''}
          onChange={update('opts')}
          className="border p-1 text-black w-full"
        />
      </label>
      <label className="block mb-1">
        <input
          type="checkbox"
          checked={runInTerminal}
          onChange={(e) => setRunInTerminal(e.target.checked)}
          className="mr-1"
          aria-label="run in terminal"
        />
        Run in Terminal
      </label>
      <div className="mt-2">
        <TerminalOutput text={command} ariaLabel="command output" />
      </div>
      {runInTerminal && (
        <button
          type="button"
          onClick={run}
          className="mt-2 px-2 py-1 bg-ub-green text-black"
        >
          Run
        </button>
      )}
    </form>
  );
}

