import React from 'react';
import Link from 'next/link';

import * as Installer from '../../content/get-kali/installer.mdx';
import * as VMs from '../../content/get-kali/vms.mdx';
import * as ARM from '../../content/get-kali/arm.mdx';
import * as Mobile from '../../content/get-kali/mobile.mdx';
import * as Cloud from '../../content/get-kali/cloud.mdx';
import * as Containers from '../../content/get-kali/containers.mdx';
import * as Live from '../../content/get-kali/live.mdx';
import * as WSL from '../../content/get-kali/wsl.mdx';

type Platform = {
  slug: string;
  title: string;
  summary: string;
  badges?: string[];
};

const platforms: Platform[] = [
  { slug: 'installer', ...(Installer as any) },
  { slug: 'virtual-machines', ...(VMs as any) },
  { slug: 'arm', ...(ARM as any) },
  { slug: 'mobile', ...(Mobile as any) },
  { slug: 'cloud', ...(Cloud as any) },
  { slug: 'containers', ...(Containers as any) },
  { slug: 'live', ...(Live as any) },
  { slug: 'wsl', ...(WSL as any) },
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
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {platforms.map(({ slug, title, summary, badges }) => (
        <a
          key={slug}
          href={`https://www.kali.org/get-kali/#kali-${slug}`}
          target="_blank"
          rel="noopener noreferrer"
          className="group flex flex-col rounded border p-4 transition hover:border-purple-600 hover:shadow-md"
        >
          <h2 className="mb-2 text-xl font-semibold group-hover:text-purple-600">{title}</h2>
          <p className="mb-4">{summary}</p>
          {badges?.length ? (
            <ul className="mb-4 flex flex-wrap gap-2">
              {badges.map((badge) => (
                <li
                  key={badge}
                  className="rounded bg-gray-200 px-2 py-1 text-xs text-gray-800"
                >
                  {badge}
                </li>
              ))}
            </ul>
          ) : null}
          <span className="mt-auto text-blue-500 group-hover:underline">Learn more</span>
        </a>
      ))}
    </div>
  </main>
);

export default GetKali;

