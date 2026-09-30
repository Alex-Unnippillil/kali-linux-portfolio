import React from 'react';

interface TerminalOutputProps {
  text: string;
  ariaLabel?: string;
}

export default function TerminalOutput({ text, ariaLabel }: TerminalOutputProps) {
  const lines = text.split('\n');
  const copyLine = async (line: string) => {
    try {
      await navigator.clipboard.writeText(line);
    } catch {
      // ignore
    }
  };
  return (
    <div
      className="max-w-full overflow-x-auto rounded bg-black p-2 font-mono text-xs text-green-400"
      aria-label={ariaLabel}
    >
      {lines.map((line, idx) => (
        <div key={idx} className="flex items-start gap-2">
          <span className="min-w-0 flex-1 whitespace-pre-wrap break-words">{line}</span>
          <button
            className="shrink-0 text-gray-400 hover:text-white"
            onClick={() => copyLine(line)}
            aria-label="copy line"
          >
            📋
          </button>
        </div>
      ))}
    </div>
  );
}
