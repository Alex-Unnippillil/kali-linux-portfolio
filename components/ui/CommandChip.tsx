'use client';

import React, { useState } from 'react';

export interface CommandChipProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  command: string;
}

const CopyIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...props}>
    <path d="M16 1H4a2 2 0 0 0-2 2v14h2V3h12V1z" />
    <path d="M20 5H8a2 2 0 0 0-2 2v16h14a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2zm0 18H8V7h12v16z" />
  </svg>
);

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
      className={`group relative inline-flex items-center gap-1 rounded-full border border-gray-600 bg-black px-2 py-1 font-mono text-green-400 text-sm ${className}`}
      aria-label={`Copy ${command}`}
      title={copied ? 'Copied!' : 'Copy command'}
      {...props}
    >
      <span className="select-all">$ {command}</span>
      <CopyIcon className="h-4 w-4" />
      <span
        role="tooltip"
        className={`pointer-events-none absolute -top-7 left-1/2 -translate-x-1/2 whitespace-nowrap rounded bg-gray-700 px-2 py-1 text-xs text-white transition-opacity ${
          copied
            ? 'opacity-100'
            : 'opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100'
        }`}
      >
        {copied ? 'Copied!' : 'Copy'}
      </span>
    </button>
  );
}

