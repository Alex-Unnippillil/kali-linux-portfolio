'use client';

import { useEffect, useMemo, useState } from 'react';

type InfoItem = {
  label: string;
  value: string;
};

type InfoSection = {
  title: string;
  description?: string;
  items: InfoItem[];
};

const formatNumber = (value?: number, suffix = '') =>
  typeof value === 'number' ? `${value}${suffix}` : 'Unavailable';

export default function SystemInfo() {
  const [info, setInfo] = useState({
    platform: 'Unavailable',
    vendor: 'Unavailable',
    userAgent: 'Unavailable',
    language: 'Unavailable',
    languages: 'Unavailable',
    timezone: 'Unavailable',
    cores: 'Unavailable',
    memory: 'Unavailable',
    devicePixelRatio: 'Unavailable',
    screen: 'Unavailable',
    viewport: 'Unavailable',
    connection: 'Unavailable',
  });

  useEffect(() => {
    const navigatorInfo = typeof navigator !== 'undefined' ? navigator : null;
    const screenInfo = typeof window !== 'undefined' ? window.screen : null;
    const connection =
      navigatorInfo &&
      (navigatorInfo as Navigator & { connection?: { effectiveType?: string } })
        .connection?.effectiveType;

    setInfo({
      platform: navigatorInfo?.platform ?? 'Unavailable',
      vendor: navigatorInfo?.vendor || 'Unavailable',
      userAgent: navigatorInfo?.userAgent || 'Unavailable',
      language: navigatorInfo?.language || 'Unavailable',
      languages: navigatorInfo?.languages?.join(', ') || 'Unavailable',
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'Unavailable',
      cores: formatNumber(navigatorInfo?.hardwareConcurrency, ' cores'),
      memory:
        typeof (navigatorInfo as Navigator & { deviceMemory?: number })
          .deviceMemory === 'number'
          ? `${(navigatorInfo as Navigator & { deviceMemory?: number })
              .deviceMemory} GB`
          : 'Unavailable',
      devicePixelRatio: formatNumber(
        typeof window !== 'undefined' ? window.devicePixelRatio : undefined,
        'x'
      ),
      screen:
        screenInfo && screenInfo.width && screenInfo.height
          ? `${screenInfo.width} × ${screenInfo.height}`
          : 'Unavailable',
      viewport:
        typeof window !== 'undefined'
          ? `${window.innerWidth} × ${window.innerHeight}`
          : 'Unavailable',
      connection: connection ? `${connection}` : 'Unavailable',
    });
  }, []);

  const sections = useMemo<InfoSection[]>(
    () => [
      {
        title: 'System Snapshot',
        description:
          'This information is collected locally from your browser and never leaves the device.',
        items: [
          { label: 'Platform', value: info.platform },
          { label: 'Vendor', value: info.vendor },
          { label: 'CPU Cores', value: info.cores },
          { label: 'Device Memory', value: info.memory },
        ],
      },
      {
        title: 'Display',
        items: [
          { label: 'Screen Resolution', value: info.screen },
          { label: 'Viewport Size', value: info.viewport },
          { label: 'Pixel Ratio', value: info.devicePixelRatio },
        ],
      },
      {
        title: 'Locale & Network',
        items: [
          { label: 'Primary Language', value: info.language },
          { label: 'Preferred Languages', value: info.languages },
          { label: 'Time Zone', value: info.timezone },
          { label: 'Connection', value: info.connection },
        ],
      },
      {
        title: 'Browser Details',
        items: [{ label: 'User Agent', value: info.userAgent }],
      },
    ],
    [info]
  );

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
      {sections.map((section) => (
        <section
          key={section.title}
          className="rounded-2xl border border-[var(--kali-panel-border)] bg-[var(--kali-panel)]/80 shadow-kali-panel backdrop-blur-sm"
        >
          <header className="border-b border-[var(--kali-panel-border)] bg-[var(--kali-panel)]/90 px-5 py-4">
            <h2 className="text-[0.7rem] font-semibold uppercase tracking-[0.3em] text-[var(--color-text)]/70">
              {section.title}
            </h2>
            {section.description && (
              <p className="mt-2 text-xs leading-relaxed text-[var(--color-text)]/70">
                {section.description}
              </p>
            )}
          </header>
          <dl className="divide-y divide-[var(--kali-panel-border)]/80">
            {section.items.map((item) => (
              <div
                key={item.label}
                className="px-5 py-3 md:grid md:grid-cols-[220px_minmax(0,1fr)] md:items-center md:gap-6"
              >
                <dt className="text-sm font-semibold text-[var(--color-text)]/80">
                  {item.label}
                </dt>
                <dd className="mt-2 text-sm text-[var(--color-text)]/70 md:mt-0 break-words">
                  {item.value}
                </dd>
              </div>
            ))}
          </dl>
        </section>
      ))}
    </div>
  );
}
