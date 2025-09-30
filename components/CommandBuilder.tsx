import { useState } from 'react';
import TerminalOutput from './TerminalOutput';

interface BuilderProps {
  doc: string;
  build: (params: Record<string, string>) => string;
}

export default function CommandBuilder({ doc, build }: BuilderProps) {
  const [params, setParams] = useState<Record<string, string>>({});
  const update = (key: string) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setParams({ ...params, [key]: e.target.value });
  };

  const command = build(params);

  return (
    <form
      className="text-xs space-y-4"
      onSubmit={(e) => e.preventDefault()}
      aria-labelledby="command-builder-heading"
    >
      <p id="command-builder-heading" className="font-semibold">
        {doc}
      </p>

      <fieldset className="space-y-2" aria-labelledby="target-details-heading">
        <legend id="target-details-heading" className="text-[0.8rem] font-semibold">
          Target details
        </legend>
        <div className="grid gap-2 md:grid-cols-2">
          <label className="flex flex-col gap-1">
            <span>Target</span>
            <input
              aria-label="target"
              value={params.target || ''}
              onChange={update('target')}
              className="border p-1 text-black w-full"
            />
          </label>
          <label className="flex flex-col gap-1">
            <span>Port</span>
            <input
              aria-label="port"
              inputMode="numeric"
              pattern="[0-9]*"
              value={params.port || ''}
              onChange={update('port')}
              className="border p-1 text-black w-full"
            />
          </label>
        </div>
      </fieldset>

      <fieldset className="space-y-2" aria-labelledby="command-options-heading">
        <legend id="command-options-heading" className="text-[0.8rem] font-semibold">
          Command options
        </legend>
        <div className="grid gap-2">
          <label className="flex flex-col gap-1">
            <span>Options</span>
            <input
              aria-label="options"
              value={params.opts || ''}
              onChange={update('opts')}
              className="border p-1 text-black w-full"
            />
          </label>
        </div>
      </fieldset>

      <div className="mt-2">
        <TerminalOutput text={command} ariaLabel="command output" />
      </div>
    </form>
  );
}

