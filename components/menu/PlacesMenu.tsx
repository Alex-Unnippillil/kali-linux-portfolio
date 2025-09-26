import React from 'react';
import Image from 'next/image';
import Link from 'next/link';

type PlaceItem = {
  id: string;
  label: string;
  icon: string;
  description?: string;
  shortcut?: string;
  href?: string;
  targetAppId?: string;
};

type PlaceSection = {
  id: string;
  title: string;
  items: readonly PlaceItem[];
};

const SECTIONS: readonly PlaceSection[] = [
  {
    id: 'personal',
    title: 'Personal',
    items: [
      {
        id: 'home',
        label: 'Home Folder',
        description: 'Browse your personal workspace.',
        icon: '/themes/Yaru/system/user-home.png',
        targetAppId: 'file-explorer',
      },
      {
        id: 'desktop',
        label: 'Desktop',
        description: 'Pinned launchers and captured screenshots.',
        icon: '/themes/Yaru/system/user-desktop.png',
        targetAppId: 'file-explorer',
      },
      {
        id: 'documents',
        label: 'Documents',
        description: 'Reports, write-ups, and research notes.',
        icon: '/themes/Yaru/system/folder.png',
        targetAppId: 'file-explorer',
      },
      {
        id: 'downloads',
        label: 'Downloads',
        description: 'Recent tool installers and captures.',
        icon: '/themes/Yaru/system/folder.png',
        targetAppId: 'file-explorer',
      },
    ],
  },
  {
    id: 'devices',
    title: 'Devices & Locations',
    items: [
      {
        id: 'filesystem',
        label: 'Filesystem Root',
        description: 'Inspect the Kali filesystem tree.',
        icon: '/themes/Yaru/system/folder.png',
        targetAppId: 'file-explorer',
      },
      {
        id: 'trash',
        label: 'Trash',
        description: 'Review deleted items before purging.',
        icon: '/themes/Yaru/system/user-trash-full.png',
        targetAppId: 'trash',
      },
      {
        id: 'network',
        label: 'Network',
        description: 'Discover shares and remote workspaces.',
        icon: '/themes/Yaru/status/network-wireless-signal-good-symbolic.svg',
        href: 'https://www.kali.org/docs/introduction/what-is-kali-linux/',
      },
    ],
  },
  {
    id: 'shortcuts',
    title: 'Quick Actions',
    items: [
      {
        id: 'terminal',
        label: 'Open Terminal',
        description: 'Drop into a shell session.',
        icon: '/themes/Yaru/apps/bash.png',
        targetAppId: 'terminal',
        shortcut: 'Ctrl+Alt+T',
      },
      {
        id: 'settings',
        label: 'Panel Preferences',
        description: 'Adjust panel size, behaviour, and items.',
        icon: '/themes/Yaru/status/about.svg',
        targetAppId: 'settings',
      },
      {
        id: 'documentation',
        label: 'Kali Documentation',
        description: 'Official getting-started and usage guides.',
        icon: '/themes/Yaru/status/chrome_home.svg',
        href: 'https://www.kali.org/docs/',
      },
    ],
  },
];

const PlacesMenu: React.FC = () => {
  const handlePlaceClick = (item: PlaceItem) => {
    if (item.targetAppId && typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('open-app', { detail: item.targetAppId }));
    }
  };

  const renderContent = (item: PlaceItem) => (
    <>
      <span className="relative flex h-8 w-8 items-center justify-center rounded bg-white/5">
        <Image src={item.icon} alt="" width={20} height={20} aria-hidden className="h-5 w-5" />
      </span>
      <span className="flex-1 text-left">
        <span className="block text-sm font-medium text-white">{item.label}</span>
        {item.description && (
          <span className="block text-xs text-slate-300">{item.description}</span>
        )}
      </span>
      {item.shortcut && (
        <span className="whitespace-nowrap text-[11px] font-medium uppercase tracking-wide text-slate-400">
          {item.shortcut}
        </span>
      )}
    </>
  );

  return (
    <nav
      aria-label="Places menu"
      className="w-72"
    >
      <div className="h-[360px] overflow-y-auto rounded-md border border-kali-border bg-kali-menu p-2 text-white shadow-kali-panel">
        {SECTIONS.map((section, sectionIndex) => (
          <div key={section.id}>
            <h3 className="px-2 pt-2 pb-1 text-xs font-semibold uppercase tracking-wide text-slate-300">
              {section.title}
            </h3>
            <ul className="space-y-1">
              {section.items.map((item) => {
                const content = renderContent(item);

                if (item.href) {
                  return (
                    <li key={item.id}>
                      <Link
                        href={item.href}
                        target={item.href.startsWith('http') ? '_blank' : undefined}
                        rel={item.href.startsWith('http') ? 'noreferrer' : undefined}
                        className="flex w-full items-center gap-3 rounded-md px-2 py-2 text-left text-sm transition-colors duration-150 hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-400"
                      >
                        {content}
                      </Link>
                    </li>
                  );
                }

                return (
                  <li key={item.id}>
                    <button
                      type="button"
                      onClick={() => handlePlaceClick(item)}
                      className="flex w-full items-center gap-3 rounded-md px-2 py-2 text-left text-sm transition-colors duration-150 hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-400"
                    >
                      {content}
                    </button>
                  </li>
                );
              })}
            </ul>
            {sectionIndex < SECTIONS.length - 1 && (
              <div className="my-3 border-t border-white/10" aria-hidden="true" />
            )}
          </div>
        ))}
      </div>
    </nav>
  );
};

export default PlacesMenu;
