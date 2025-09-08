import React from 'react';

interface CommandChipProps {
  command: string;
}

export default function CommandChip({ command }: CommandChipProps) {
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(command);
    } catch {
      // ignore clipboard errors
    }
  };

  return (
    <button
      type="button"
      onClick={copy}
      className="px-2 py-0.5 rounded border text-xs font-mono bg-ub-cool-grey text-white hover:bg-ub-orange focus:outline-none focus:ring"
    >
      {command}
    </button>
  );
}
