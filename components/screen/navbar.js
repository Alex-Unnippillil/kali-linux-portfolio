import React from 'react';
import Image from 'next/image';
import Clock from '../util-components/clock';
import WhiskerMenu from '../menu/WhiskerMenu';
import { useTheme } from '../../hooks/useTheme';

export default function Navbar(props) {
  const { theme, setTheme } = useTheme();

  const quickLaunch = [
    { href: '/terminal', icon: '/themes/kali/panel/terminal.svg', label: 'Terminal' },
    { href: '/browser', icon: '/themes/kali/panel/browser.svg', label: 'Browser' },
    { href: '/files', icon: '/themes/kali/panel/files.svg', label: 'Files' }
  ];

  return (
    <div className="kali-panel sticky top-0 z-50 grid grid-cols-[auto_auto_1fr_auto_auto] items-center w-full bg-[var(--panel)] border-b border-[var(--panel-border)] backdrop-blur bg-opacity-80 shadow-md text-ubt-grey text-sm select-none">
      <WhiskerMenu />
      <div className="flex items-center gap-2 px-2">
        {quickLaunch.map(link => (
          <a key={link.href} href={link.href} className="p-1 rounded hover:bg-white/10">
            <Image src={link.icon} alt={link.label} width={16} height={16} className="w-4 h-4" />
          </a>
        ))}
      </div>
      <div className="flex justify-center gap-1">
        {[1, 2, 3, 4].map(n => (
          <a
            key={n}
            data-ws={n}
            href={`#ws-${n}`}
            className="px-2 py-1 rounded hover:bg-white/10 text-xs"
          >
            {n}
          </a>
        ))}
      </div>
      <button
        aria-label="Toggle theme"
        onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
        className="mx-2 px-2 py-1 rounded-full hover:bg-white/10"
      >
        <Image
          src={theme === 'dark' ? '/themes/kali/panel/sun.svg' : '/themes/kali/panel/moon.svg'}
          alt="Theme"
          width={16}
          height={16}
          className="w-4 h-4"
        />
      </button>
      <span className="px-2">
        <Clock />
      </span>
    </div>
  );
}
