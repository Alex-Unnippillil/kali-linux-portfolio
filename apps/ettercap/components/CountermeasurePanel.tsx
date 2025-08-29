'use client';

import React from 'react';

interface Scenario {
  title: string;
  mitigations: string[];
  tips: string[];
}

const scenarios: Scenario[] = [
  {
    title: 'ARP Poisoning',
    mitigations: [
      'Use static ARP entries for critical systems',
      'Enable Dynamic ARP Inspection on switches',
    ],
    tips: [
      'Monitor ARP tables for unexpected changes',
      'Isolate untrusted hosts with VLANs',
    ],
  },
  {
    title: 'DNS Spoofing',
    mitigations: [
      'Deploy DNSSEC to validate responses',
      'Use encrypted DNS (DoT/DoH) when possible',
    ],
    tips: [
      'Alert on unusual DNS traffic patterns',
      'Keep resolver caches hardened and updated',
    ],
  },
  {
    title: 'Traffic Filtering',
    mitigations: [
      'Apply filters to drop sensitive protocols',
      'Block rogue DHCP and ARP replies',
    ],
    tips: [
      'Log dropped packets for review',
      'Regularly audit filtering rules',
    ],
  },
];

const CountermeasurePanel: React.FC = () => (
  <div id="countermeasures" className="mt-4 rounded bg-ub-grey p-4">
    <h2 className="mb-4 text-xl">Countermeasures</h2>
    {scenarios.map(({ title, mitigations, tips }) => (
      <div key={title} className="mb-4">
        <h3 className="text-lg text-green-400">{title}</h3>
        <h4 className="mt-2 text-sm text-gray-300">Mitigations</h4>
        <ul className="list-inside list-disc text-sm">
          {mitigations.map((m) => (
            <li key={m}>{m}</li>
          ))}
        </ul>
        <h4 className="mt-2 text-sm text-gray-300">Defender Tips</h4>
        <ul className="list-inside list-disc text-sm">
          {tips.map((t) => (
            <li key={t}>{t}</li>
          ))}
        </ul>
      </div>
    ))}
  </div>
);

export default CountermeasurePanel;

