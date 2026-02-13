import Link from 'next/link';

const platforms = [
  {
    title: 'Bare Metal',
    description: 'Install Kali directly on your hardware.',
    href: '/get-kali/bare-metal',
  },
  {
    title: 'VMs',
    description: 'Run Kali in your favourite virtual machine.',
    href: '/get-kali/vms',
  },
  {
    title: 'ARM',
    description: 'Kali for ARM devices and single-board computers.',
    href: '/get-kali/arm',
  },
  {
    title: 'Cloud',
    description: 'Deploy Kali instances on cloud providers.',
    href: '/get-kali/cloud',
  },
  {
    title: 'Containers',
    description: 'Use Kali from container images.',
    href: '/get-kali/containers',
  },
  {
    title: 'WSL',
    description: 'Run Kali on Windows using the WSL subsystem.',
    href: '/get-kali/wsl',
  },
];

export default function GetKaliPage() {
  return (
    <main className="mx-auto max-w-5xl px-4 py-8">
      <h1 className="mb-8 text-3xl font-bold">Get Kali</h1>
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {platforms.map((platform) => (
          <Link
            key={platform.title}
            href={platform.href}
            aria-label={platform.title}
            className="rounded-lg border border-slate-200 p-6 transition-colors hover:bg-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-500"
          >
            <h2 className="mb-2 text-xl font-semibold">{platform.title}</h2>
            <p className="text-sm text-slate-600">{platform.description}</p>
          </Link>
        ))}
      </div>
    </main>
  );
}

