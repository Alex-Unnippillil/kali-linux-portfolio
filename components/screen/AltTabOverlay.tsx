"use client";

import React from 'react';
import Image from 'next/image';

interface AppInfo {
  id: string;
  title: string;
  icon: string;
}

interface AltTabOverlayProps {
  apps: AppInfo[];
  active: number;
  show: boolean;
}

const AltTabOverlay: React.FC<AltTabOverlayProps> = ({ apps, active, show }) => {
  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center bg-black/60 transition-opacity duration-150 ${
        show ? 'opacity-100' : 'opacity-0 pointer-events-none'
      }`}
    >
      <div
        className={`flex gap-4 p-4 bg-ub-cool-grey rounded-lg transform transition-transform duration-150 ${
          show ? 'scale-100' : 'scale-95'
        }`}
      >
        {apps.map((app, i) => (
          <div
            key={app.id}
            className={`flex flex-col items-center w-20 ${i === active ? '' : 'opacity-60'}`}
          >
            <Image
              src={app.icon.replace('./', '/')}
              alt={`Kali ${app.title}`}
              width={48}
              height={48}
              className="mb-1 w-12 h-12"
              sizes="48px"
            />
            <span className="text-xs text-white text-center truncate w-full">{app.title}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default AltTabOverlay;
