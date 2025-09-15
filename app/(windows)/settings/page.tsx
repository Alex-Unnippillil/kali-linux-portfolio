import { headers } from 'next/headers';

import type { AppearancePayload } from '@/lib/appearance-store';

function resolveBaseUrl(): string {
  const headerList = headers();
  const forwardedHost = headerList.get('x-forwarded-host');
  const host = forwardedHost ?? headerList.get('host');

  if (host) {
    const protocol =
      headerList.get('x-forwarded-proto') ??
      (host.includes('localhost') || host.startsWith('127.') ? 'http' : 'https');
    return `${protocol}://${host}`;
  }

  const envUrl =
    process.env.NEXT_PUBLIC_SITE_URL ??
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null);

  if (envUrl) {
    return envUrl.replace(/\/+$, '');
  }

  return 'http://localhost:3000';
}

async function fetchAppearance(): Promise<AppearancePayload> {
  const baseUrl = resolveBaseUrl();
  const url = new URL('/api/appearance', baseUrl);
  const response = await fetch(url.toString(), {
    next: { tags: ['appearance'] },
  });

  if (!response.ok) {
    throw new Error(`Failed to load appearance data (${response.status})`);
  }

  return response.json() as Promise<AppearancePayload>;
}

const formatBoolean = (value: boolean) => (value ? 'Enabled' : 'Disabled');

export default async function SettingsPage() {
  const { settings, options } = await fetchAppearance();

  const currentSettings = [
    { label: 'Theme', value: settings.theme },
    { label: 'Accent color', value: settings.accent },
    { label: 'Wallpaper', value: settings.wallpaper },
    { label: 'Density', value: settings.density },
    { label: 'Font scale', value: settings.fontScale.toString() },
    { label: 'Reduced motion', value: formatBoolean(settings.reducedMotion) },
    { label: 'High contrast', value: formatBoolean(settings.highContrast) },
    { label: 'Large hit areas', value: formatBoolean(settings.largeHitAreas) },
    { label: 'Pong spin', value: formatBoolean(settings.pongSpin) },
    { label: 'Network access', value: formatBoolean(settings.allowNetwork) },
    { label: 'Haptics', value: formatBoolean(settings.haptics) },
  ];

  const optionSections = [
    { title: 'Available themes', items: options.themes },
    { title: 'Accent palette', items: options.accents },
    { title: 'Wallpapers', items: options.wallpapers },
    { title: 'Density presets', items: options.densities },
  ];

  return (
    <section className="flex h-full flex-col gap-6 overflow-y-auto bg-slate-950/70 p-6 text-sm text-slate-200">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold text-white">Appearance</h1>
        <p className="max-w-2xl text-slate-300">
          Review the current desktop theme configuration and the presets that can be applied across the Kali Linux desktop
          simulation.
        </p>
      </header>

      <article className="rounded-lg border border-slate-800 bg-slate-900/60 p-4 shadow">
        <h2 className="mb-3 text-lg font-medium text-white">Current settings</h2>
        <dl className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {currentSettings.map(({ label, value }) => (
            <div key={label} className="flex flex-col rounded border border-slate-800/50 bg-slate-900/40 p-3">
              <dt className="text-xs uppercase tracking-wide text-slate-400">{label}</dt>
              <dd className="mt-1 text-base text-white">{value}</dd>
            </div>
          ))}
        </dl>
      </article>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {optionSections.map((section) => (
          <article
            key={section.title}
            className="rounded-lg border border-slate-800 bg-slate-900/60 p-4 shadow"
          >
            <h3 className="mb-3 text-base font-medium text-white">{section.title}</h3>
            <ul className="flex flex-wrap gap-2">
              {section.items.map((item) => (
                <li
                  key={item}
                  className="rounded-full border border-slate-700/60 bg-slate-800/80 px-3 py-1 text-xs uppercase tracking-wide text-slate-200"
                >
                  {item}
                </li>
              ))}
            </ul>
          </article>
        ))}
      </div>
    </section>
  );
}
