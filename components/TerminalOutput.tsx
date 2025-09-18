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
      className="bg-black font-mono text-xs text-[#f8f8f2] selection:bg-blue-600 selection:text-white p-2 rounded border border-blue-900/40"
      aria-label={ariaLabel}
    >
      {lines.map((line, idx) => (
        <div key={idx} className="flex items-start">
          <span className="flex-1 whitespace-pre-wrap">{line}</span>
          <button
            className="ml-2 rounded p-1 text-[#7ab8ff] transition-colors hover:text-[#a6d8ff]"
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
