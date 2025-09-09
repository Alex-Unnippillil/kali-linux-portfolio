import React from 'react';
import Image from 'next/image';
import Callout from '../components/ui/Callout';
import Header from '../components/layout/Header';
import Footer from '../components/layout/Footer';
import ImageWizard from '../components/downloads/ImageWizard';

import * as Installer from '../content/get-kali/installer.tsx';
import * as VMs from '../content/get-kali/vms.tsx';
import * as ARM from '../content/get-kali/arm.tsx';
import * as Mobile from '../content/get-kali/mobile.tsx';
import * as Cloud from '../content/get-kali/cloud.tsx';
import * as Containers from '../content/get-kali/containers.tsx';
import * as Live from '../content/get-kali/live.tsx';
import * as WSL from '../content/get-kali/wsl.tsx';
import * as WinKex from '../content/get-kali/win-kex.tsx';
import * as Purple from '../content/get-kali/purple.tsx';
import * as Docs from '../content/get-kali/docs.tsx';

const badgeIcons: Record<string, string> = {
  aws: '/icons/providers/aws.svg',
  azure: '/icons/providers/azure.svg',
  gcp: '/icons/providers/gcp.svg',
};

type Platform = {
  slug: string;
  title: string;
  summary: string;
  badges: string[];
  url?: string;
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
  {
    slug: 'win-kex',
    url: 'https://www.kali.org/docs/wsl/win-kex/',
    ...(WinKex as any),
  },
  { slug: 'purple', ...(Purple as any) },
  { slug: 'docs', url: 'https://www.kali.org/docs/', ...(Docs as any) },
];

const GetKali: React.FC = () => (
  <>
    <Header />
    <main className="p-4">
      <ImageWizard />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {platforms.map(({ slug, title, summary, badges, url }) => (
          <div key={slug} className="border rounded p-4 flex flex-col">
            <h2 className="text-xl font-semibold mb-2">{title}</h2>
            <p className="mb-4">{summary}</p>
            {badges?.length > 0 && (
              <ul className="flex flex-wrap gap-2 mb-4">
                {badges.map((badge) => {
                  const icon = badgeIcons[badge];
                  return (
                    <li key={badge} className="flex items-center justify-center">
                      {icon ? (
                        <Image src={icon} alt={badge} width={24} height={24} className="h-6 w-6" />
                      ) : (
                        <span className="bg-gray-200 text-gray-800 px-2 py-1 rounded text-xs">
                          {badge}
                        </span>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
            <a
              href={url ?? `https://www.kali.org/get-kali/#kali-${slug}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-500 hover:underline mt-auto"
            >
              Learn more
            </a>
          </div>
        ))}
      </div>
      <div className="mt-6">
        <Callout variant="verifyDownload">
          <p>
            Verify downloads using signatures or hashes{' '}
            <a
              href="https://www.kali.org/docs/introduction/download-validation/"
              target="_blank"
              rel="noopener noreferrer"
              className="underline"
            >
              Verification instructions
            </a>
            .
          </p>
        </Callout>
      </div>
    </main>
    <Footer />
  </>
);

export default GetKali;
