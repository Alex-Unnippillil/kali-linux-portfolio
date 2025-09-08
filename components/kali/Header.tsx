import React from 'react';
import ia from '../../data/ia.json';
import StatusPill from './StatusPill';
import { Icon } from '../ui/Icon';
import MobileSheet from '../menu/MobileSheet';

interface NavItem {
  label: string;
  href?: string;
  children?: NavItem[];
}

const Header: React.FC = () => {
  const [open, setOpen] = React.useState(false);
  return (
    <header className="border-b border-gray-700 p-4">
      <div className="flex items-center">
        <button
          type="button"
          className="md:hidden mr-4"
          aria-label="Open menu"
          onClick={() => setOpen(true)}
        >
          <Icon name="menu" className="w-6 h-6" />
        </button>
        <nav aria-label="Main navigation" className="hidden md:block flex-grow">
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
        <div className="md:hidden ml-auto">
          <StatusPill />
        </div>
      </div>
      <MobileSheet open={open} onClose={() => setOpen(false)} />
    </header>
  );
};

export default Header;

