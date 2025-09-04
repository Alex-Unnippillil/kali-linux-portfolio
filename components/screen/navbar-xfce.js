import React from 'react';
import Image from 'next/image';

const defaultIcons = {
  whisker: '/themes/Kali/whisker.svg',
  launcher1: '/themes/Kali/firefox.svg',
  launcher2: '/themes/Kali/terminal.svg',
  launcher3: '/themes/Kali/files.svg',
};

export default function NavbarXfce({ icons = {} }) {
  const allIcons = { ...defaultIcons, ...icons };
  const launchers = [allIcons.launcher1, allIcons.launcher2, allIcons.launcher3];

  const handleClick = (name) => {
    console.log(`${name} clicked`);
  };

  return (
    <div className="xfce-navbar flex items-center space-x-1 p-1">
      <button
        aria-label="Whisker menu"
        onClick={() => handleClick('whisker')}
        className="launcher-btn p-1 rounded"
      >
        <Image src={allIcons.whisker} alt="Whisker menu" width={24} height={24} />
      </button>
      {launchers.map((src, i) => (
        <button
          key={i}
          aria-label={`Launcher ${i + 1}`}
          onClick={() => handleClick(`launcher${i + 1}`)}
          className="launcher-btn p-1 rounded"
        >
          <Image src={src} alt={`Launcher ${i + 1}`} width={24} height={24} />
        </button>
      ))}
      <style jsx>{`
        .launcher-btn:hover {
          background-color: color-mix(in srgb, var(--kali-accent) 15%, transparent);
        }
      `}</style>
    </div>
  );
}

