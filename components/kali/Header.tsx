import React from 'react';
import ia from '../../data/ia.json';
import StatusPill from './StatusPill';

interface NavItem {
  label: string;
  href?: string;
  children?: NavItem[];
}

const Header: React.FC = () => (
  <header className="relative border-b border-gray-700 p-4">
    <a
      href="#main-content"
      className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-full focus:mt-2 focus:rounded focus:bg-black focus:px-4 focus:py-2 focus:text-white"
    >
      Skip to main content
    </a>
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
        <li className="ml-auto">
          <StatusPill />
        </li>
      </ul>
    </nav>
  </header>
);

export default Header;
