import { useState } from 'react';
import TerminalOutput from './TerminalOutput';

interface BuilderProps {
  doc: string;
  build: (params: Record<string, string>) => string;
}

export default function CommandBuilder({ doc, build }: BuilderProps) {
  const [params, setParams] = useState<Record<string, string>>({});
  const update = (key: string) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setParams(prev => ({ ...prev, [key]: e.target.value }));
  };

  const command = build(params);
  const targetPattern = '^(https?:\/\/)?[\w.-]+(?::\d+)?(?:\/.*)?$';
  const optionsPattern = "^[\w\s\-/:.=\"']*$";

  return (
    <form
      className="text-xs space-y-3"
      onSubmit={(e) => e.preventDefault()}
      aria-label="command builder"
    >
      <p className="mb-1" aria-label="inline docs">
        {doc}
      </p>
      <fieldset className="space-y-2 rounded border border-white/20 p-2">
        <legend className="px-1 text-[11px] font-semibold uppercase tracking-wide text-white/70">
          Command inputs
        </legend>
        <label className="flex flex-col gap-1" htmlFor="command-target">
          <span className="text-[11px] font-medium uppercase tracking-wide text-white/80">
            Target URL or host
          </span>
          <input
            id="command-target"
            aria-label="target"
            value={params.target || ''}
            onChange={update('target')}
            className="w-full rounded border border-white/30 bg-white px-2 py-1 text-black"
            inputMode="url"
            pattern={targetPattern}
            placeholder="https://target.local"
          />
        </label>
        <label className="flex flex-col gap-1" htmlFor="command-options">
          <span className="text-[11px] font-medium uppercase tracking-wide text-white/80">
            Command options
          </span>
          <input
            id="command-options"
            aria-label="options"
            value={params.opts || ''}
            onChange={update('opts')}
            className="w-full rounded border border-white/30 bg-white px-2 py-1 text-black"
            inputMode="text"
            pattern={optionsPattern}
            placeholder="-X POST -H 'Accept: application/json'"
          />
        </label>
      </fieldset>
      <fieldset className="space-y-2 rounded border border-white/20 p-2">
        <legend className="px-1 text-[11px] font-semibold uppercase tracking-wide text-white/70">
          Preview
        </legend>
        <TerminalOutput text={command} ariaLabel="command output" />
      </fieldset>
    </form>
  );
}
