'use client';

import React from 'react';
import usePersistentState from '../../hooks/usePersistentState';

interface Metapackage {
  id: string;
  name: string;
  dependencies: string[];
}

type Action = 'install' | 'remove';

const METAPACKAGES: Metapackage[] = [
  {
    id: 'kali-linux-default',
    name: 'kali-linux-default',
    dependencies: ['kali-tools-top10'],
  },
  {
    id: 'kali-linux-large',
    name: 'kali-linux-large',
    dependencies: ['kali-linux-default', 'kali-tools-everything'],
  },
  {
    id: 'kali-tools-top10',
    name: 'kali-tools-top10',
    dependencies: ['nmap', 'hydra', 'john', 'sqlmap', 'aircrack-ng'],
  },
  {
    id: 'kali-tools-wireless',
    name: 'kali-tools-wireless',
    dependencies: ['aircrack-ng', 'kismet', 'wireless-tools'],
  },
];

const KaliTweaks: React.FC = () => {
  const [actions, setActions] = usePersistentState<Record<string, Action>>(
    'kaliTweaks.metapackages',
    {},
  );

  const toggle = (id: string, action: Action) => {
    setActions((prev) => {
      const next = { ...prev };
      if (next[id] === action) {
        delete next[id];
      } else {
        next[id] = action;
      }
      return next;
    });
  };

  return (
    <div className="h-full overflow-auto bg-gray-900 p-4 text-white text-sm">
      <h1 className="mb-4 text-2xl">Kali Tweaks</h1>
      <p className="mb-4 text-gray-300">
        Select metapackages to install or remove. Selections are saved locally.
      </p>
      <table className="w-full border-collapse">
        <thead>
          <tr className="text-left">
            <th className="p-2">Metapackage</th>
            <th className="p-2">Dependencies</th>
            <th className="p-2 text-center">Install</th>
            <th className="p-2 text-center">Remove</th>
          </tr>
        </thead>
        <tbody>
          {METAPACKAGES.map((pkg) => (
            <tr key={pkg.id} className="border-t border-gray-700">
              <td className="p-2 font-medium">{pkg.name}</td>
              <td className="p-2">
                <ul className="list-disc pl-4">
                  {pkg.dependencies.map((dep) => (
                    <li key={dep}>{dep}</li>
                  ))}
                </ul>
              </td>
              <td className="p-2 text-center">
                <input
                  type="checkbox"
                  aria-label="Install"
                  checked={actions[pkg.id] === 'install'}
                  onChange={() => toggle(pkg.id, 'install')}
                />
              </td>
              <td className="p-2 text-center">
                <input
                  type="checkbox"
                  aria-label="Remove"
                  checked={actions[pkg.id] === 'remove'}
                  onChange={() => toggle(pkg.id, 'remove')}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default KaliTweaks;

