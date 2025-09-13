'use client';

import Image from 'next/image';
import { useTheme } from '@/hooks/useTheme';
import { kaliTheme } from '@/styles/themes/kali';

interface Platform {
  key: string;
  label: string;
  icon: string;
}

const PLATFORMS: Platform[] = [
  { key: 'arm', label: 'ARM', icon: '/icons/arm.svg' },
  { key: 'bare-metal', label: 'Bare Metal', icon: '/icons/bare-metal.svg' },
  { key: 'cloud', label: 'Cloud', icon: '/icons/cloud.svg' },
  { key: 'virtual-machine', label: 'Virtual Machine', icon: '/icons/virtual-machine.svg' },
  { key: 'wsl', label: 'WSL', icon: '/icons/wsl.svg' },
  { key: 'mobile', label: 'Mobile', icon: '/icons/mobile.svg' },
  { key: 'container', label: 'Container', icon: '/icons/container.svg' },
];

export default function PlatformGrid() {
  const { theme } = useTheme();
  if (theme !== 'kali') return null;

  return (
    <div
      className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-4"
      style={{ backgroundColor: kaliTheme.background, color: kaliTheme.text }}
    >
      {PLATFORMS.map(({ key, label, icon }) => (
        <div key={key} className="flex flex-col items-center text-center p-2">
          <Image src={icon} alt={label} width={64} height={64} />
          <span className="mt-2 text-sm md:text-base">{label}</span>
        </div>
      ))}
    </div>
  );
}

