import React from 'react';
import ia from '../../data/ia.json';
import StatusPill from './StatusPill';

interface NavItem {
  label: string;
  href?: string;
  children?: NavItem[];
}

const badgeBase = 'inline-block rounded px-2 py-1 text-xs font-semibold';
const badgeVariants: Record<'info', string> = {
  info: 'bg-blue-600 text-white',
};

const Header: React.FC = () => {
  const release = (ia as any).releasePill;

  return (
    <header className="border-b border-gray-700 p-4">
      <nav aria-label="Main navigation">
        <ul className="flex flex-wrap items-center gap-4">
          {(ia as any).header.map((item: NavItem) => (
            <li key={item.label} className="relative">
              {item.children ? (
                <details>
                  <summary className="cursor-pointer list-none">{item.label}</summary>
                  <ul className="mt-2 space-y-1">
                    {item.children.map((child) => (
                      <li key={child.label}>
                        <a href={child.href} className="hover:underline">
                          {child.label}
                        </a>
                      </li>
                    ))}
                  </ul>
                </details>
              ) : (
                <a href={item.href} className="hover:underline">
                  {item.label}
                </a>
              )}
            </li>
          ))}
          <li className="ml-auto flex items-center gap-2">
            {release?.enabled && (
              <a
                href={release.href}
                className={`${badgeBase} ${badgeVariants.info}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                {release.label}
              </a>
            )}
            <StatusPill />
          </li>
        </ul>
      </nav>
    </header>
  );
};

export default Header;
