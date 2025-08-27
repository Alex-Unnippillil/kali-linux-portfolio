import React from 'react';
import SecurityTool, { CommandSnippet } from '../SecurityTool';

const sections = [
  {
    id: 'overview',
    title: 'Overview',
    content: (
      <p>
        Wireshark is a network protocol analyzer that lets you inspect traffic in real time and offline.
      </p>
    ),
  },
  {
    id: 'install',
    title: 'Install',
    content: (
      <div>
        <p>Install Wireshark:</p>
        <CommandSnippet command="sudo apt install wireshark" />
      </div>
    ),
  },
  {
    id: 'commands',
    title: 'Commands',
    content: (
      <div>
        <CommandSnippet command="wireshark -r sample.pcap" />
        <CommandSnippet command="tshark -i eth0" />
      </div>
    ),
  },
  {
    id: 'lab',
    title: 'Lab',
    content: (
      <p>
        Capture traffic on a test network interface and analyze the packets using display filters.
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
            href="https://www.wireshark.org/docs/"
            target="_blank"
            rel="noreferrer"
          >
            Official documentation
          </a>
        </li>
        <li>
          <a
            className="underline text-blue-400"
            href="https://wiki.wireshark.org/SampleCaptures"
            target="_blank"
            rel="noreferrer"
          >
            Sample captures
          </a>
        </li>
      </ul>
    ),
  },
];

export default function WiresharkApp() {
  return (
    <SecurityTool
      name="Wireshark"
      sections={sections}
      resources={[{ label: 'Sample capture', href: '/apps/wireshark/sample.pcap' }]}
    />
  );
}
