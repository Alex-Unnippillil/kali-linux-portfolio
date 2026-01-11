'use client';

import { useEffect, useState } from 'react';

interface Release {
  title: string;
  date: string;
}

export default function Releases() {
  const [releases, setReleases] = useState<Release[]>([]);

  useEffect(() => {
    fetch('/data/releases.json')
      .then((res) => res.json())
      .then((data: Release[]) => setReleases(data))
      .catch(() => {
        /* ignore */
      });
  }, []);

  return (
    <div className="min-h-screen bg-ub-cool-grey text-white p-4">
      <h1 className="text-2xl font-bold mb-4">Releases</h1>
      <ul className="space-y-2">
        {releases.map((r) => (
          <li key={r.title} className="flex justify-between">
            <span>{r.title}</span>
            <span className="text-sm text-gray-400">{r.date}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
