import { useState } from 'react';
import TerminalOutput from './TerminalOutput';
import { FormField, FormInput } from './forms';

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
      <FormField id="command-builder-target" label="Target">
        <FormInput
          value={params.target || ''}
          onChange={update('target')}
          aria-label="target"
        />
      </FormField>
      <FormField id="command-builder-options" label="Options">
        <FormInput
          value={params.opts || ''}
          onChange={update('opts')}
          aria-label="options"
        />
      </FormField>
      <div className="mt-2">
        <TerminalOutput text={command} ariaLabel="command output" />
      </div>
    </form>
  );
}

