import React from 'react';

interface TerminalOutputProps {
  text: string;
  ariaLabel?: string;
  canCopy?: boolean;
}

export default function TerminalOutput({ text, ariaLabel, canCopy = true }: TerminalOutputProps) {
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
      className="bg-black text-green-400 font-mono text-xs p-2 rounded"
      aria-label={ariaLabel}
    >
      {lines.map((line, idx) => (
        <div key={idx} className="flex items-start">
          <span className="flex-1 whitespace-pre-wrap">{line}</span>
          <button
            className="ml-2 text-gray-400 hover:text-white"
            type="button"
            disabled={!canCopy}
            aria-disabled={!canCopy}
            onClick={() => {
              if (canCopy) {
                void copyLine(line);
              }
            }}
            aria-label="copy line"
            title={
              canCopy
                ? 'Copy line to clipboard'
                : 'Clipboard access disabled by privacy settings'
            }
          >
            📋
          </button>
        </div>
      ))}
    </div>
  );
}
