"use client";

import { useState } from 'react';

interface ReleaseInfo {
  component: string;
  previous: string;
  current: string;
}

const data: ReleaseInfo[] = [
  { component: 'Image', previous: '2023.4', current: '2024.1' },
  { component: 'Kernel', previous: '6.5', current: '6.7' },
  { component: 'Desktop', previous: 'KDE Plasma 5.27', current: 'KDE Plasma 5.28' },
];

const ReleaseComparison = () => {
  const [query, setQuery] = useState('');

  const filtered = data.filter((item) =>
    item.component.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div className="p-4 print:p-0">
      <input
        id="comparison-filter"
        type="search"
        aria-label="Filter components"
        placeholder="Filter components"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className="mb-4 w-full rounded border p-2 print:border-black"
      />
      <table className="w-full border-collapse print:border print:border-black">
        <thead>
          <tr>
            <th className="border p-2 print:border-black">Component</th>
            <th className="border p-2 print:border-black">N-1</th>
            <th className="border p-2 print:border-black">Current</th>
          </tr>
        </thead>
        <tbody>
          {filtered.map((item) => (
            <tr key={item.component}>
              <td className="border p-2 print:border-black">{item.component}</td>
              <td className="border p-2 print:border-black">{item.previous}</td>
              <td className="border p-2 print:border-black">{item.current}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default ReleaseComparison;

