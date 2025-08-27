import React from 'react';
import SecurityTool, { CommandSnippet } from '../SecurityTool';

const sections = [
  {
    id: 'overview',
    title: 'Overview',
    content: (
      <p>
        Metasploit is a framework for developing and executing exploit code against remote targets.
      </p>
    ),
  },
  {
    id: 'install',
    title: 'Install',
    content: (
      <div>
        <p>Install Metasploit Framework:</p>
        <CommandSnippet command="sudo apt install metasploit-framework" />
      </div>
    ),
  },
  {
    id: 'commands',
    title: 'Commands',
    content: (
      <div>
        <CommandSnippet command="msfconsole" />
        <CommandSnippet command="msfvenom -l payloads" />
      </div>
    ),
  },
  {
    id: 'lab',
    title: 'Lab',
    content: (
      <p>
        Use Metasploit in a controlled lab to learn exploitation workflows and module usage.
      </p>
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
            href="https://docs.metasploit.com/"
            target="_blank"
            rel="noreferrer"
          >
            Official documentation
          </a>
        </li>
        <li>
          <a
            className="underline text-blue-400"
            href="https://github.com/rapid7/metasploit-framework"
            target="_blank"
            rel="noreferrer"
          >
            Metasploit on GitHub
          </a>
        </li>
      </ul>
    ),
  },
];

export default function MetasploitApp() {
  return <SecurityTool name="Metasploit" sections={sections} />;
}
