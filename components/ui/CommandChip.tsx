'use client';

import React, { useState } from 'react';

interface CommandChipProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  command: string;
}

export default function CommandChip({ command, className = '', ...props }: CommandChipProps) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(command);
      setCopied(true);
      setTimeout(() => setCopied(false), 1000);
    } catch {
      // ignore
    }
  };

  return (
    <button
      type="button"
      onClick={copy}
      className={`inline-flex items-center rounded bg-black px-2 py-1 font-mono text-green-400 text-sm ${className}`}
      aria-label={`Copy ${command}`}
      {...props}
    >
      <span className="select-all">$ {command}</span>
      {copied && <span className="ml-2 text-xs text-gray-400">Copied</span>}
    </button>
  );
}

