import React from 'react';
import ia from '../../data/ia.json';
import StatusPill from './StatusPill';

interface NavItem {
  label: string;
  href?: string;
  children?: NavItem[];
}

const renderNavItem = (item: NavItem): React.ReactNode => {
  if (item.children) {
    return (
      <details>
        <summary className="cursor-pointer list-none">{item.label}</summary>
        <ul className="mt-2 space-y-1 pl-4">
          {item.children.map((child) => (
            <li key={child.label}>{renderNavItem(child)}</li>
          ))}
        </ul>
      </details>
    );
  }

  return (
    <a href={item.href ?? '#'} className="hover:underline">
      {item.label}
    </a>
  );
};

const Header: React.FC = () => (
  <header className="border-b border-gray-700 p-4">
    <nav aria-label="Main navigation">
      <ul className="flex flex-wrap items-center gap-4">
        {(ia as any).header.map((item: NavItem) => (
          <li key={item.label} className="relative">
            {renderNavItem(item)}
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
