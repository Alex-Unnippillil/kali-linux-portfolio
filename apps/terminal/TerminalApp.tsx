'use client';

import React, { useRef, useState } from 'react';
import Terminal from './components/Terminal';

const CopyIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    viewBox="0 0 24 24"
    width={16}
    height={16}
    fill="none"
    stroke="currentColor"
    strokeWidth={2}
    strokeLinecap="round"
    strokeLinejoin="round"
    {...props}
  >
    <rect x={9} y={9} width={13} height={13} rx={2} ry={2} />
    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
  </svg>
);

const PasteIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    viewBox="0 0 24 24"
    width={16}
    height={16}
    fill="none"
    stroke="currentColor"
    strokeWidth={2}
    strokeLinecap="round"
    strokeLinejoin="round"
    {...props}
  >
    <path d="M8 5H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2" />
    <rect x={9} y={2} width={6} height={4} rx={1} />
  </svg>
);

const TerminalApp: React.FC = () => {
  const outputRef = useRef<HTMLDivElement>(null);
  const [input, setInput] = useState('');

  const user = 'kali';
  const host = 'localhost';
  const cwd = '~/workspace';
  const branch = 'main';
  const exitCode = 0;
  const exitClass = exitCode === 0 ? 'text-green-500' : 'text-red-500';

  const handleCopy = () => {
    const text = outputRef.current?.innerText ?? '';
    navigator.clipboard.writeText(text).catch(() => {});
  };

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      setInput((prev) => prev + text);
    } catch {}
  };

  return (
    <div className="h-full w-full relative">
      <div className="absolute top-2 right-2 flex gap-2 text-white">
        <button onClick={handleCopy} aria-label="Copy terminal output">
          <CopyIcon />
        </button>
        <button onClick={handlePaste} aria-label="Paste into terminal">
          <PasteIcon />
        </button>
      </div>
      <Terminal className="h-full w-full p-4 overflow-auto">
        <div
          ref={outputRef}
          className="whitespace-pre"
          data-testid="terminal-output"
        >
          <span className={exitClass}>{exitCode}</span> {user}@{host} {cwd} (
          {branch}) $
          {input}
        </div>
      </Terminal>
    </div>
  );
};

export default TerminalApp;

