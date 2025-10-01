import dynamic from 'next/dynamic';
import type { GetStaticProps } from 'next';
import React, { Suspense } from 'react';
import AppCatalogShell from '../../components/pages/app-catalog/AppCatalogShell';
import {
  buildAppMetadata,
  loadAppRegistry,
  type AppMetadata,
} from '../../lib/appRegistry';

const DynamicCatalog = dynamic(
  () => import('../../components/pages/app-catalog/AppCatalogHydrated'),
  { suspense: true, ssr: false } as any,
);

type ShellApp = {
  id: string;
  title: string;
  icon?: string | null;
  meta: AppMetadata;
};

type AppEntry = {
  id: string;
  title: string;
  icon?: string | null;
  disabled?: boolean;
};

type AppsPageProps = {
  generatedAt: string;
  shellApps: ShellApp[];
  initialApps: AppEntry[];
  initialMetadata: Record<string, AppMetadata>;
};

const AppsPage: React.FC<AppsPageProps> = ({
  generatedAt,
  shellApps,
  initialApps,
  initialMetadata,
}) => (
  <Suspense fallback={<AppCatalogShell generatedAt={generatedAt} apps={shellApps} />}>
    <DynamicCatalog
      generatedAt={generatedAt}
      initialApps={initialApps}
      initialMetadata={initialMetadata}
    />
  </Suspense>
);

export const getStaticProps: GetStaticProps<AppsPageProps> = async () => {
  const { apps, metadata } = await loadAppRegistry();
  const sanitized: AppEntry[] = apps.map((app) => ({
    id: app.id,
    title: app.title,
    icon: app.icon ?? null,
    disabled: Boolean(app.disabled),
  }));
  const filtered = sanitized.filter((app) => !app.disabled);
  const shellApps: ShellApp[] = filtered.slice(0, 8).map((app) => ({
    id: app.id,
    title: app.title,
    icon: app.icon ?? null,
    meta:
      metadata[app.id] ??
      buildAppMetadata({ ...app, icon: app.icon ?? undefined }),
  }));

  return {
    props: {
      generatedAt: new Date().toISOString(),
      shellApps,
      initialApps: sanitized,
      initialMetadata: metadata,
    },
    revalidate: 1800,
  };
};

export default AppsPage;
