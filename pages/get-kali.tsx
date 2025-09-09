import React from 'react';
import Image from 'next/image';
import Callout from '../components/ui/Callout';
import Header from '../components/layout/Header';
import Footer from '../components/layout/Footer';
import ImageWizard from '../components/downloads/ImageWizard';


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
  {
    slug: 'installer',
    title: 'Installer',
    summary: 'Full-featured ISO for bare-metal installation.',
    badges: ['amd64', 'arm64'],
  },
  {
    slug: 'virtual-machines',
    title: 'Virtual Machines',
    summary: 'Pre-built images for VMware and VirtualBox.',
    badges: ['vmware', 'virtualbox'],
  },
  {
    slug: 'arm',
    title: 'ARM',
    summary: 'Images for ARM-based single-board computers.',
    badges: ['arm', 'arm64'],
  },
  {
    slug: 'mobile',
    title: 'Mobile (NetHunter)',
    summary: 'Kali NetHunter for Android devices.',
    badges: ['android'],
  },
  {
    slug: 'cloud',
    title: 'Cloud',
    summary: 'Images for AWS, Azure, and other cloud providers.',
    badges: ['aws', 'azure', 'gcp'],
  },
  {
    slug: 'containers',
    title: 'Containers',
    summary: 'Docker and LXC/LXD container images.',
    badges: ['docker', 'lxc'],
  },
  {
    slug: 'live',
    title: 'Live',
    summary: 'Bootable live system with optional persistence.',
    badges: ['usb'],
  },
  {
    slug: 'wsl',
    title: 'WSL',
    summary: 'Kali Linux for Windows Subsystem for Linux.',
    badges: ['wsl'],
  },
  {
    slug: 'win-kex',
    title: 'Win-KeX',
    summary: 'Graphical desktop experience for Kali on WSL.',
    badges: ['wsl'],
    url: 'https://www.kali.org/docs/wsl/win-kex/',
  },
  {
    slug: 'purple',
    title: 'Kali Purple',
    summary: 'Security operations-focused Kali variant.',
    badges: ['soc'],
  },
  {
    slug: 'docs',
    title: 'Documentation',
    summary: 'Official Kali Linux guides and tutorials.',
    badges: ['docs'],
    url: 'https://www.kali.org/docs/',
  },
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
