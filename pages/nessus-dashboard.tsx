import dynamic from 'next/dynamic';
import type { GetStaticProps } from 'next';
import React, { Suspense } from 'react';
import NessusDashboardShell from '../components/pages/nessus-dashboard/NessusDashboardShell';
import type {
  NessusDashboardStaticProps,
} from '../utils/ssg/nessus';
import { buildNessusDashboardStaticProps } from '../utils/ssg/nessus';

const NessusDashboardHydrated = dynamic(
  () =>
    import('../components/pages/nessus-dashboard/NessusDashboardHydrated').then(
      (mod) => mod.NessusDashboardHydrated,
    ),
  { suspense: true, ssr: false } as any,
);

type NessusDashboardPageProps = NessusDashboardStaticProps;

const NessusDashboardPage: React.FC<NessusDashboardPageProps> = ({
  generatedAt,
  shellTotals,
  initialTotals,
}) => (
  <Suspense
    fallback={<NessusDashboardShell generatedAt={generatedAt} totals={shellTotals} />}
  >
    <NessusDashboardHydrated
      generatedAt={generatedAt}
      initialTotals={initialTotals}
    />
  </Suspense>
);

export const getStaticProps: GetStaticProps<NessusDashboardStaticProps> = async () => {
  const props = await buildNessusDashboardStaticProps();
  return {
    props,
    revalidate: 1800,
  };
};

export default NessusDashboardPage;
