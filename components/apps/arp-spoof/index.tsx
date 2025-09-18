'use client';

import React from 'react';
import Topology from './Topology';

const phases = [
  {
    title: '1. Reconnaissance',
    detail:
      'Identify targets on the local network and learn their MAC addresses using passive discovery.',
  },
  {
    title: '2. Poisoning',
    detail:
      'Send crafted ARP replies that convince the victim and gateway that the attacker owns the other host\'s MAC address.',
  },
  {
    title: '3. Relay & Monitor',
    detail:
      'Forward intercepted packets to keep the session alive while capturing credentials and manipulating flows.',
  },
];

const ArpSpoofLab: React.FC = () => (
  <div className="space-y-6 p-4 text-gray-100">
    <header className="space-y-2">
      <h1 className="text-2xl font-bold">ARP Spoof Lab</h1>
      <p className="max-w-3xl text-sm text-gray-300">
        Explore a guided simulation of an Address Resolution Protocol spoofing
        attack. Drag the devices around the network map to see how the spoofed
        paths adjust while you read about each stage in the workflow. The lab
        focuses on the defensive takeaway—understanding what the attack changes
        and how defenders can spot it.
      </p>
    </header>

    <Topology />

    <section className="rounded-lg border border-gray-700 bg-gray-900 p-4">
      <h2 className="text-lg font-semibold text-gray-100">Attack stages</h2>
      <ol className="mt-3 list-decimal space-y-3 pl-5 text-sm text-gray-300">
        {phases.map((phase) => (
          <li key={phase.title}>
            <span className="font-semibold text-gray-100">{phase.title}</span>
            <p className="mt-1">{phase.detail}</p>
          </li>
        ))}
      </ol>
    </section>

    <section className="rounded-lg border border-gray-700 bg-gray-900 p-4 text-sm text-gray-300">
      <h2 className="text-lg font-semibold text-gray-100">Defensive notes</h2>
      <ul className="mt-2 list-disc space-y-2 pl-5">
        <li>
          Look for repeated unsolicited ARP replies, especially when the sender
          MAC does not match the expected host.
        </li>
        <li>
          Enable dynamic ARP inspection or port security on managed switches to
          validate bindings before they reach endpoints.
        </li>
        <li>
          Deploy host intrusion detection agents that baseline ARP tables and
          raise alerts when a gateway entry suddenly changes.
        </li>
      </ul>
    </section>
  </div>
);

export default ArpSpoofLab;
