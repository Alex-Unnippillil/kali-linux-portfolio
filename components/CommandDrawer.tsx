'use client';

import React from 'react';
import TerminalOutput from './TerminalOutput';

interface CommandDrawerProps {
  open: boolean;
  onClose: () => void;
  command: string;
  expectedOutput: string;
  prerequisites: string[];
  os: {
    name: string;
    version: string;
  };
}

export default function CommandDrawer({
  open,
  onClose,
  command,
  expectedOutput,
  prerequisites,
  os,
}: CommandDrawerProps) {
  return (
    <div
      className={`fixed inset-0 bg-black/50 transition-opacity ${open ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
      onClick={onClose}
    >
      <div
        className={`absolute right-0 top-0 h-full w-80 bg-gray-900 p-4 overflow-y-auto transform transition-transform ${open ? 'translate-x-0' : 'translate-x-full'}`}
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-lg mb-4">Setup</h3>
        <div className="mb-4">
          <h4 className="font-semibold">OS Requirements</h4>
          <p>{os.name} {os.version}</p>
        </div>
        <div className="mb-4">
          <h4 className="font-semibold">Prerequisites</h4>
          <ul className="list-disc list-inside">
            {prerequisites.map((p) => (
              <li key={p}>{p}</li>
            ))}
          </ul>
        </div>
        <div className="mb-4">
          <h4 className="font-semibold">Command</h4>
          <TerminalOutput text={command} ariaLabel="command" />
        </div>
        <div className="mb-4">
          <h4 className="font-semibold">Expected Output</h4>
          <TerminalOutput text={expectedOutput} ariaLabel="expected output" />
        </div>
      </div>
    </div>
  );
}

