import { useState, useEffect } from 'react';
import TerminalOutput from './TerminalOutput';

interface BuilderProps {
  doc: string;
  build: (params: Record<string, string>) => string;
  openApp?: (id: string) => void;
}

export default function CommandBuilder({ doc, build, openApp }: BuilderProps) {
  const [params, setParams] = useState<Record<string, string>>({});
  const [runInTerminal, setRunInTerminal] = useState(false);
  const update = (key: string) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setParams({ ...params, [key]: e.target.value });
  };

  const command = build(params);

  useEffect(() => {
    if (!runInTerminal || !command) return;
    openApp?.('terminal');
    setTimeout(() => {
      window.dispatchEvent(
        new CustomEvent('run-terminal-command', { detail: command })
      );
    }, 0);
  }, [runInTerminal, command, openApp]);

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
      <label className="inline-flex items-center mt-2">
        <input
          type="checkbox"
          checked={runInTerminal}
          onChange={(e) => setRunInTerminal(e.target.checked)}
          className="mr-1"
        />
        <span>Run in terminal</span>
      </label>
      <div className="mt-2">
        <TerminalOutput text={command} ariaLabel="command output" />
      </div>
    </form>
  );
}

