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
      <div className="mt-2">
        <TerminalOutput
          text={command}
          ariaLabel="command output"
          copyButtonLabel="Copy command"
          successMessage="Command copied to clipboard"
        />
      </div>
    </form>
  );
}

