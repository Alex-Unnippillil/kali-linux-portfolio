"use client";

import { useEffect, useState } from 'react';
import { detectArch } from '@/lib/ua';

const matrix = [
  {
    feature: 'Full hardware access',
    bare: 'Yes',
    vm: 'Partial',
    wsl: 'No',
    cloud: 'No',
  },
  {
    feature: 'Snapshots & rollback',
    bare: 'No',
    vm: 'Yes',
    wsl: 'No',
    cloud: 'Provider dependent',
  },
  {
    feature: 'Persistence',
    bare: 'Yes',
    vm: 'Yes',
    wsl: 'Yes',
    cloud: 'Yes',
  },
  {
    feature: 'Setup effort',
    bare: 'Manual install',
    vm: 'Import image',
    wsl: 'Enable feature',
    cloud: 'Provision instance',
  },
  {
    feature: 'Ideal for',
    bare: 'Dedicated device',
    vm: 'Testing on host',
    wsl: 'Windows integration',
    cloud: 'Ephemeral tasks',
  },
];

const InstallMatrix: React.FC = () => {
  const [arch, setArch] = useState('');

  useEffect(() => {
    detectArch().then((a) => setArch(a));
  }, []);

  return (
    <div>
      {arch && arch !== 'unknown' && (
        <p className="mb-4">
          Detected architecture: <span className="font-semibold">{arch}</span>. Consider using the{' '}
          <span className="font-semibold">{arch}</span> build.
        </p>
      )}
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr>
            <th className="border border-ubt-grey p-2 text-left">Feature</th>
            <th className="border border-ubt-grey p-2">Bare metal</th>
            <th className="border border-ubt-grey p-2">VM</th>
            <th className="border border-ubt-grey p-2">WSL</th>
            <th className="border border-ubt-grey p-2">Cloud</th>
          </tr>
        </thead>
        <tbody>
          {matrix.map((row) => (
            <tr key={row.feature}>
              <th className="border border-ubt-grey p-2 text-left">{row.feature}</th>
              <td className="border border-ubt-grey p-2 text-center">{row.bare}</td>
              <td className="border border-ubt-grey p-2 text-center">{row.vm}</td>
              <td className="border border-ubt-grey p-2 text-center">{row.wsl}</td>
              <td className="border border-ubt-grey p-2 text-center">{row.cloud}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default InstallMatrix;

