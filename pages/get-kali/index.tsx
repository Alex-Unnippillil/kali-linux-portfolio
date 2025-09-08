import React from 'react';
import Link from 'next/link';
import DownloadCard from '../../components/platforms/DownloadCard';

const tiles = [
  {
    title: 'ARM',
    caption: 'Run Kali on ARM devices like Raspberry Pi and Pinebook.',
    href: 'https://www.kali.org/get-kali/#kali-arm',
  },
  {
    title: 'Cloud',
    caption: 'Deploy Kali on AWS, Azure and other cloud providers.',
    href: 'https://www.kali.org/get-kali/#kali-cloud',
  },
  {
    title: 'Containers',
    caption: 'Pull Kali Docker and LXC images for portable use.',
    href: 'https://www.kali.org/get-kali/#kali-containers',
  },
  {
    title: 'Mobile',
    caption: 'Install Kali NetHunter on supported Android devices.',
    href: 'https://www.kali.org/get-kali/#kali-mobile',
  },
  {
    title: 'VMs',
    caption: 'Run Kali in VMware or VirtualBox with pre-built images.',
    href: 'https://www.kali.org/get-kali/#kali-virtual-machines',
  },
  {
    title: 'WSL',
    caption: 'Use Kali within Windows Subsystem for Linux.',
    href: 'https://www.kali.org/get-kali/#kali-wsl',
  },
  {
    title: 'Live',
    caption: 'Boot from a USB drive for a fully-featured live session.',
    href: 'https://www.kali.org/get-kali/#kali-live',
  },
  {
    title: 'Installer',
    caption: 'Install Kali to your system using our installer images.',
    href: 'https://www.kali.org/get-kali/#kali-installer-images',
  },
];

const GetKali: React.FC = () => (
  <main className="p-4">
    <div className="mb-6 flex items-center justify-between rounded bg-purple-600 p-4 text-white">
      <span className="text-lg">New to Kali Linux? Learn how to get started.</span>
      <Link
        href="/install-options"
        className="rounded bg-white px-4 py-2 font-semibold text-purple-700 hover:bg-purple-50"
      >
        Learn More
      </Link>
    </div>
    <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
      {tiles.map((tile) => (
        <DownloadCard key={tile.title} {...tile} />
      ))}
    </div>
  </main>
);

export default GetKali;
