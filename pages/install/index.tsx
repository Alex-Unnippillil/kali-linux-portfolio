"use client";

import Link from 'next/link';

const options = [
  { id: 'bare-metal', label: 'Bare Metal' },
  { id: 'vms', label: 'VMs' },
  { id: 'arm', label: 'ARM' },
  { id: 'cloud', label: 'Cloud' },
  { id: 'containers', label: 'Containers' },
  { id: 'wsl', label: 'WSL' },
];

export default function InstallOptions() {
  return (
    <main className="p-4 space-y-4">
      <h1 className="text-2xl mb-4">Installation Options</h1>
      <ul className="space-y-2">
        {options.map((opt) => (
          <li
            key={opt.id}
            className="flex items-center justify-between border p-2 rounded"
          >
            <span>{opt.label}</span>
            <Link href={`/install/${opt.id}`}>
              <button className="bg-ubt-blue text-white px-3 py-1 rounded">
                Learn More
              </button>
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}

