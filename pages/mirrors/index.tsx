"use client";

import { useState } from 'react';
import mirrorsData from '../../data/mirrors.json';
import MirrorMap, { Mirror } from '../../components/MirrorMap';

const mirrors = mirrorsData as Mirror[];

export default function MirrorsPage() {
  const [selected, setSelected] = useState<Mirror | null>(null);

  return (
    <main className="p-4 text-center">
      <h1 className="text-2xl font-bold mb-4">Kali Linux Mirrors</h1>
      <p className="mb-4">Select a mirror from the map to learn more.</p>
      <MirrorMap mirrors={mirrors} selectedId={selected?.id} onSelect={setSelected} />
      {selected && (
        <div className="mt-4 p-4 border rounded max-w-md mx-auto text-left">
          <h2 className="font-semibold">{selected.name}</h2>
          <p className="text-sm mb-2">{selected.location}</p>
          <p className="mb-2">{selected.description}</p>
          <a href={selected.url} className="text-blue-500 underline">
            {selected.url}
          </a>
        </div>
      )}
      <noscript>
        <table className="mt-4 mx-auto text-left border-collapse">
          <thead>
            <tr>
              <th className="border px-2 py-1">Name</th>
              <th className="border px-2 py-1">Location</th>
              <th className="border px-2 py-1">URL</th>
              <th className="border px-2 py-1">Description</th>
            </tr>
          </thead>
          <tbody>
            {mirrors.map((m) => (
              <tr key={m.id}>
                <td className="border px-2 py-1">{m.name}</td>
                <td className="border px-2 py-1">{m.location}</td>
                <td className="border px-2 py-1">
                  <a href={m.url}>{m.url}</a>
                </td>
                <td className="border px-2 py-1">{m.description}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </noscript>
    </main>
  );
}
