"use client";

import { useRouter } from 'next/router';
import Link from 'next/link';

const TITLES: Record<string, string> = {
  'bare-metal': 'Bare Metal',
  vms: 'VMs',
  arm: 'ARM',
  cloud: 'Cloud',
  containers: 'Containers',
  wsl: 'WSL',
};

export default function InstallCategory() {
  const router = useRouter();
  const { category } = router.query;
  if (typeof category !== 'string' || !TITLES[category]) {
    return (
      <main className="p-4">
        <p>Unknown category.</p>
        <Link href="/install" className="underline">
          Back to options
        </Link>
      </main>
    );
  }
  const title = TITLES[category];
  return (
    <main className="p-4 space-y-4">
      <h1 className="text-2xl">{title}</h1>
      <p>
        More information about {title} installation coming soon.
      </p>
      <Link href="/install" className="underline">
        Back to options
      </Link>
    </main>
  );
}

