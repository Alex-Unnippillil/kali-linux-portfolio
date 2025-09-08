import React from 'react';

interface Edition {
  name: string;
  description: string;
  tone: 'info' | 'warning' | 'danger';
  href: string;
}

const editions: Edition[] = [
  {
    name: 'Rootless',
    description: 'Run NetHunter in Termux without root access.',
    tone: 'info',
    href: 'https://www.kali.org/docs/nethunter/nethunter-rootless/',
  },
  {
    name: 'Lite',
    description: 'Essential tools for rooted devices with minimal footprint.',
    tone: 'warning',
    href: 'https://www.kali.org/docs/nethunter/',
  },
  {
    name: 'Full',
    description: 'Complete experience with Wi-Fi injection and HID attacks.',
    tone: 'danger',
    href: 'https://www.kali.org/docs/nethunter/',
  },
];

const toneClasses: Record<Edition['tone'], string> = {
  info: 'bg-info text-black',
  warning: 'bg-warning text-black',
  danger: 'bg-danger text-black',
};

export interface NetHunterTileProps {
  variant?: 'grid' | 'list';
}

const NetHunterTile: React.FC<NetHunterTileProps> = ({ variant = 'grid' }) => {
  const containerClass =
    variant === 'list' ? 'space-y-4' : 'grid gap-4 md:grid-cols-3';
  return (
    <div className={containerClass}>
      {editions.map(({ name, description, tone, href }) => (
        <div key={name} className="border rounded p-4 flex flex-col">
          <span
            className={`self-start rounded px-2 py-1 text-xs font-semibold ${toneClasses[tone]}`}
          >
            {name}
          </span>
          <p className="mt-2 mb-4">{description}</p>
          <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-auto text-blue-500 hover:underline"
          >
            Documentation
          </a>
        </div>
      ))}
    </div>
  );
};

export default NetHunterTile;

