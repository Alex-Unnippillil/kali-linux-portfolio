'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';

interface Section {
  label: string;
  links: { label: string; href: string }[];
}

const SECTIONS: Section[] = [
  {
    label: 'Documentation',
    links: [
      { href: '/docs', label: 'Docs pages' },
      { href: '/tools', label: 'Tools docs' },
    ],
  },
  {
    label: 'Support',
    links: [
      { href: '/faq', label: 'FAQ' },
      { href: '/known-issues', label: 'Known Issues' },
    ],
  },
];

const HOVER_DELAY = 200; // tuned for a calm UX feel

export default function MegaMenu() {
  const [active, setActive] = useState<number | null>(null);
  const openTimer = useRef<NodeJS.Timeout>();
  const closeTimer = useRef<NodeJS.Timeout>();

  const handleItemEnter = (idx: number) => {
    clearTimeout(closeTimer.current);
    openTimer.current = setTimeout(() => setActive(idx), HOVER_DELAY);
  };

  const handleMenuLeave = () => {
    clearTimeout(openTimer.current);
    closeTimer.current = setTimeout(() => setActive(null), HOVER_DELAY);
  };

  const handleMenuEnter = () => {
    clearTimeout(closeTimer.current);
  };

  useEffect(() => {
    return () => {
      clearTimeout(openTimer.current);
      clearTimeout(closeTimer.current);
    };
  }, []);

  return (
    <div className="relative" onMouseEnter={handleMenuEnter} onMouseLeave={handleMenuLeave}>
      <ul className="flex gap-4">
        {SECTIONS.map((section, idx) => (
          <li
            key={section.label}
            className="relative"
            onMouseEnter={() => handleItemEnter(idx)}
          >
            <button type="button" className="hover:underline">
              {section.label}
            </button>
            {active === idx && (
              <div className="absolute left-0 top-full mt-1 bg-ub-grey text-white shadow-lg p-4">
                <ul className="grid gap-2 sm:grid-cols-2">
                  {section.links.map((link) => (
                    <li key={link.href}>
                      <Link href={link.href} className="block hover:underline">
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

