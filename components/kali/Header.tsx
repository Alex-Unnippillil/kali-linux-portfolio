import React from 'react';
import ia from '../../data/ia.json';
import StatusPill from './StatusPill';

interface NavItem {
  label: string;
  href?: string;
  caption?: string;
  children?: NavItem[];
}

const Header: React.FC = () => (
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
                    <li key={child.label} className="space-y-1">
                      <a href={child.href} className="hover:underline block">
                        {child.label}
                      </a>
                      {child.caption && (
                        <p className="text-xs text-gray-400">{child.caption}</p>
                      )}
                    </li>
                  ))}
                </ul>
              </details>
            ) : (
              <div className="space-y-1">
                <a href={item.href} className="hover:underline block">
                  {item.label}
                </a>
                {item.caption && (
                  <p className="text-xs text-gray-400">{item.caption}</p>
                )}
              </div>
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
