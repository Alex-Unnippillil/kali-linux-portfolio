'use client';

import { useState } from 'react';
import Link from 'next/link';

interface Dialog {
  id: string;
  name: string;
  href: string;
  keywords: string[];
}

// List of existing settings dialogs in Xfce-inspired order
const dialogs: Dialog[] = [
  {
    id: 'appearance',
    name: 'Appearance',
    href: '/ui/settings/theme',
    keywords: ['appearance', 'theme', 'look'],
  },
  {
    id: 'keyboard',
    name: 'Keyboard',
    href: '/keyboard-reference',
    keywords: ['keyboard', 'shortcuts'],
  },
];

export default function SettingsManager() {
  const [query, setQuery] = useState('');
  const q = query.toLowerCase();

  const filtered = dialogs.filter(
    (d) =>
      d.name.toLowerCase().includes(q) ||
      d.keywords.some((k) => k.toLowerCase().includes(q))
  );

  const highlight = (text: string) => {
    if (!q) return text;
    return text
      .split(new RegExp(`(${query})`, 'ig'))
      .map((part, i) =>
        part.toLowerCase() === q ? <mark key={i}>{part}</mark> : part
      );
  };

  return (
    <div className="p-4">
      <input
        type="text"
        placeholder="Search settings..."
        aria-label="Search settings"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className="w-full mb-4 px-2 py-1 rounded bg-ub-cool-grey text-ubt-grey"
      />
      <ul className="space-y-2">
        {filtered.map((d) => (
          <li key={d.id}>
            <Link href={d.href} className="block p-2 rounded hover:bg-ubt-grey">
              {highlight(d.name)}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

