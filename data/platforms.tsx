import React from 'react';

export interface PlatformInfo {
  slug: string;
  title: string;
  bullets: string[];
  meta: { label: string; value: React.ReactNode }[];
}

export const platforms: PlatformInfo[] = [
  {
    slug: 'vmware',
    title: 'VMware',
    bullets: [
      'Run Kali in a VMware virtual machine',
      'Use snapshots to save and revert your setup anytime',
    ],
    meta: [
      {
        label: 'Docs',
        value: (
          <a
            href="https://www.kali.org/docs/virtualization/install-vmware/"
            target="_blank"
            rel="noopener noreferrer"
            className="underline"
          >
            Installation Guide
          </a>
        ),
      },
      { label: 'Default login', value: <code>kali/kali</code> },
    ],
  },
  {
    slug: 'cloud',
    title: 'Cloud',
    bullets: [
      'Deploy Kali on popular cloud providers for on-demand access.',
      'Access your environment from anywhere.',
    ],
    meta: [
      {
        label: 'Docs',
        value: (
          <a
            href="https://www.kali.org/docs/cloud/"
            target="_blank"
            rel="noopener noreferrer"
            className="underline"
          >
            Cloud Docs
          </a>
        ),
      },
    ],
  },
  {
    slug: 'usb-live',
    title: 'USB Live',
    bullets: [
      'Boot from a portable USB drive without touching your disk.',
      'Enable persistence for a customizable environment.',
    ],
    meta: [
      {
        label: 'Docs',
        value: (
          <a
            href="https://www.kali.org/docs/usb/usb-persistence/"
            target="_blank"
            rel="noopener noreferrer"
            className="underline"
          >
            Persistence Guide
          </a>
        ),
      },
    ],
  },
];

export function getPlatformSlugs() {
  return platforms.map((p) => p.slug);
}

export function getPlatformBySlug(slug: string) {
  return platforms.find((p) => p.slug === slug);
}

