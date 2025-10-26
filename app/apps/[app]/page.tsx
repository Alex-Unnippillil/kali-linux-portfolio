import type { ComponentType } from 'react';
import type { Metadata } from 'next';
import dynamic from 'next/dynamic';

const CANONICAL_BASE = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://unnippillil.com';

type ParamsPromise = Promise<{ app: string }>; 

interface PageProps {
  params: ParamsPromise;
}

const canonicalFor = (slug: string) => `/apps/${encodeURIComponent(slug)}`;

const formatAppName = (slug: string) =>
  slug
    .split(/[-_]/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ') || slug;

async function resolveParams(params: ParamsPromise) {
  const { app } = await params;
  const slug = decodeURIComponent(app);

  return {
    slug,
    appName: formatAppName(slug),
  };
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await resolveParams(params);
  const canonicalPath = canonicalFor(slug);
  const canonicalUrl = new URL(canonicalPath, CANONICAL_BASE).toString();

  return {
    title: `${slug} — Kali Desktop`,
    alternates: {
      canonical: canonicalUrl,
    },
  };
}

const LoadingPlaceholder = ({ label }: { label: string }) => (
  <div className="flex min-h-[320px] items-center justify-center rounded border border-white/10 bg-black/40 text-white/80">
    {`Loading ${label}…`}
  </div>
);

const ErrorPlaceholder = ({ label }: { label: string }) => (
  <div className="rounded border border-red-500/40 bg-red-500/10 p-4 text-sm text-red-200">
    {`Unable to load ${label}.`}
  </div>
);

export default async function AppPage({ params }: PageProps) {
  const { slug, appName } = await resolveParams(params);

  const AppContent = dynamic<ComponentType<Record<string, never>>>(
    () =>
      import(`@/apps/${slug}`)
        .then((mod) => {
          const Component = mod.default as
            | ComponentType<Record<string, never>>
            | undefined;

          if (Component) {
            return Component;
          }

          if (process.env.NODE_ENV !== 'production') {
            console.error(`App module "${slug}" did not export a default component.`);
          }

          return () => <ErrorPlaceholder label={appName} />;
        })
        .catch((error) => {
          if (process.env.NODE_ENV !== 'production') {
            console.error(`Failed to load app module "${slug}"`, error);
          }
          return () => <ErrorPlaceholder label={appName} />;
        }),
    {
      ssr: false,
      loading: () => <LoadingPlaceholder label={appName} />,
    }
  );

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-6 p-6">
      <header>
        <h1 className="text-3xl font-semibold text-white">{appName}</h1>
      </header>
      <AppContent />
    </main>
  );
}
