import React from 'react';
import SecurityTool, { CommandSnippet } from '../SecurityTool';

const sections = [
  {
    id: 'overview',
    title: 'Overview',
    content: (
      <p>
        Ghidra is a software reverse engineering suite created by the NSA for analyzing binaries.
      </p>
    ),
  },
  {
    id: 'install',
    title: 'Install',
    content: (
      <div>
        <p>Install Ghidra:</p>
        <CommandSnippet command="sudo apt install ghidra" />
      </div>
    ),
  },
  {
    id: 'commands',
    title: 'Commands',
    content: (
      <div>
        <CommandSnippet command="ghidraRun" />
        <CommandSnippet command="analyzeHeadless /path/project" />
      </div>
    ),
  },
  {
    id: 'lab',
    title: 'Lab',
    content: (
      <p>Open the sample binary and identify functions and strings.</p>
    ),
  },
  {
    id: 'reading',
    title: 'Further reading',
    content: (
      <ul className="list-disc pl-4 space-y-1">
        <li>
          <a
            className="underline text-blue-400"
            href="https://ghidra-sre.org/"
            target="_blank"
            rel="noreferrer"
          >
            Official site
          </a>
        </li>
        <li>
          <a
            className="underline text-blue-400"
            href="https://ghidra.re/"
            target="_blank"
            rel="noreferrer"
          >
            Community resources
          </a>
        </li>
      </ul>
    ),
  },
];

export default function GhidraApp() {
  return (
    <SecurityTool
      name="Ghidra"
      sections={sections}
      resources={[{ label: 'Sample binary', href: '/apps/ghidra/sample.bin' }]}
    />
  );
}
