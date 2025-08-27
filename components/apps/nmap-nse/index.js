import React from 'react';
import SecurityTool, { CommandSnippet } from '../SecurityTool';

const sections = [
  {
    id: 'overview',
    title: 'Overview',
    content: (
      <p>
        Nmap's Scripting Engine (NSE) extends Nmap's capabilities using Lua scripts to automate network tasks.
      </p>
    ),
  },
  {
    id: 'install',
    title: 'Install',
    content: (
      <div>
        <p>Install Nmap:</p>
        <CommandSnippet command="sudo apt install nmap" />
      </div>
    ),
  },
  {
    id: 'commands',
    title: 'Commands',
    content: (
      <div>
        <CommandSnippet command="nmap --script http-title scanme.nmap.org" />
        <CommandSnippet command="nmap --script ssl-cert example.com" />
      </div>
    ),
  },
  {
    id: 'lab',
    title: 'Lab',
    content: (
      <p>
        Practice by scanning a local test host and exploring different NSE scripts.
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
            href="https://nmap.org/book/nse.html"
            target="_blank"
            rel="noreferrer"
          >
            NSE documentation
          </a>
        </li>
        <li>
          <a
            className="underline text-blue-400"
            href="https://nmap.org/nsedoc/"
            target="_blank"
            rel="noreferrer"
          >
            Script library
          </a>
        </li>
      </ul>
    ),
  },
];

export default function NmapNseApp() {
  return <SecurityTool name="Nmap NSE" sections={sections} />;
}
