'use client';

import { useEffect, useRef } from 'react';

interface AboutMegaMenuProps {
  onClose: () => void;
}

const groups = [
  {
    items: [
      { label: 'Kali Linux Overview', href: 'https://www.kali.org/features/' },
      { label: 'Press Pack', href: 'https://gitlab.com/kalilinux/documentation/press-pack/-/archive/main/press-pack-main.zip' },
      { label: 'Wallpapers', href: 'https://www.kali.org/wallpapers/' },
      { label: 'Kali Swag Store', href: 'https://offsec.usa.dowlis.com/kali/view-all.html' },
    ],
  },
  {
    items: [
      { label: 'Meet The Kali Team', href: 'https://www.kali.org/about-us/' },
      { label: 'Contact Us', href: 'https://www.kali.org/contact/' },
    ],
  },
];

export default function AboutMegaMenu({ onClose }: AboutMegaMenuProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [onClose]);

  return (
    <div
      ref={ref}
      className="fixed left-0 top-12 z-50 w-full bg-white shadow-lg p-4 rtl:left-auto rtl:right-0"
    >
      {groups.map((group, index) => (
        <ul
          key={index}
          className={`grid gap-2 sm:grid-cols-2${index > 0 ? ' mt-4 border-t pt-4' : ''}`}
        >
          {group.items.map((item) => (
            <li key={item.label}>
              <a href={item.href} className="block hover:underline">
                {item.label}
              </a>
            </li>
          ))}
        </ul>
      ))}
    </div>
  );
}

