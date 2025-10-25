import React from 'react';

interface Props {
  addFolder?: (name: string) => void;
  openApp?: (id: string) => void;
}

const rows = [
  {
    feature: 'Setup',
    bareMetal: 'Requires dedicated hardware and manual OS installation.',
    vm: 'Needs hypervisor and VM configuration.',
    wsl: 'Install from Microsoft Store; integrates with Windows.',
    cloud: 'Provision instance and connect over the network.',
  },
  {
    feature: 'Performance',
    bareMetal: 'Full performance with direct hardware access.',
    vm: 'Small overhead; depends on host resources.',
    wsl: 'Near-native CPU performance but limited GPU access.',
    cloud: 'Varies by provider and instance size; network latency applies.',
  },
  {
    feature: 'Isolation',
    bareMetal: 'No isolation from host; affects system directly.',
    vm: 'Strong isolation between host and guest.',
    wsl: 'Shares Windows kernel; moderate isolation.',
    cloud: 'Isolated from local machine; provider manages host.',
  },
  {
    feature: 'Hardware access',
    bareMetal: 'Full access to all devices.',
    vm: 'Virtualized access; USB/GPU require passthrough.',
    wsl: 'Limited USB and peripheral support.',
    cloud: 'Minimal local device access.',
  },
  {
    feature: 'Use cases',
    bareMetal: 'Best for dedicated lab hardware.',
    vm: 'Great for snapshots and disposable environments.',
    wsl: 'Convenient for Windows development workflows.',
    cloud: 'Accessible anywhere with pay-as-you-go pricing.',
  },
];

const EnvironmentComparison: React.FC<Props> = () => (
  <div className="p-4 overflow-auto text-white bg-ub-cool-grey h-full">
    <table className="w-full text-sm border-collapse">
      <thead>
        <tr className="bg-gray-800">
          <th className="p-2 text-left">Feature</th>
          <th className="p-2 text-left">Bare Metal</th>
          <th className="p-2 text-left">VM</th>
          <th className="p-2 text-left">WSL</th>
          <th className="p-2 text-left">Cloud</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <tr key={row.feature} className="border-t border-gray-700 align-top">
            <th className="p-2 text-left font-medium">{row.feature}</th>
            <td className="p-2">{row.bareMetal}</td>
            <td className="p-2">{row.vm}</td>
            <td className="p-2">{row.wsl}</td>
            <td className="p-2">{row.cloud}</td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

export default EnvironmentComparison;
