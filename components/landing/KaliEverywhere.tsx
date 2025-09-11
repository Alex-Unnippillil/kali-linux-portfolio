import React from 'react';

interface Platform {
  name: string;
  href: string;
}

const platforms: Platform[] = [
  { name: 'ARM', href: 'https://www.kali.org/get-kali/#kali-arm' },
  { name: 'Bare Metal', href: 'https://www.kali.org/get-kali/#kali-bare-metal' },
  { name: 'Cloud', href: 'https://www.kali.org/get-kali/#kali-cloud' },
  { name: 'Containers', href: 'https://www.kali.org/get-kali/#kali-containers' },
  { name: 'Virtual Machines', href: 'https://www.kali.org/get-kali/#kali-virtual-machines' },
  { name: 'WSL', href: 'https://www.kali.org/get-kali/#kali-wsl' },
];

export default function KaliEverywhere() {
  return (
    <section aria-labelledby="kali-everywhere">
      <h2 id="kali-everywhere" className="mb-4 text-xl font-bold">
        Kali Everywhere
      </h2>
      <div className="overflow-x-auto md:overflow-visible">
        <ul className="flex gap-4 md:flex-wrap">
          {platforms.map(({ name, href }) => (
            <li key={name} className="flex-none w-48">
              <a
                href={href}
                className="block h-full p-4 rounded border border-[var(--color-border)] bg-[var(--color-surface)] hover:bg-[var(--color-muted)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]"
              >
                {name}
              </a>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
