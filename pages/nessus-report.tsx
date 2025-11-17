import dynamic from 'next/dynamic';
import type { GetStaticProps } from 'next';
import React, { Suspense } from 'react';
import NessusReportShell from '../components/pages/nessus-report/NessusReportShell';
import type { NessusReportStaticProps } from '../utils/ssg/nessus';
import { buildNessusReportStaticProps } from '../utils/ssg/nessus';

const NessusReportHydrated = dynamic(
  () =>
    import('../components/pages/nessus-report/NessusReportHydrated').then(
      (mod) => mod.NessusReportHydrated,
    ),
  { suspense: true, ssr: false } as any,
);

type NessusReportPageProps = NessusReportStaticProps;

const NessusReportPage: React.FC<NessusReportPageProps> = ({
  generatedAt,
  shellData,
  initialFindings,
}) => (
  <Suspense
    fallback={<NessusReportShell generatedAt={generatedAt} shell={shellData} />}
  >
    <NessusReportHydrated
      generatedAt={generatedAt}
      initialFindings={initialFindings}
    />
  </Suspense>
);

export const getStaticProps: GetStaticProps<NessusReportStaticProps> = async () => {
  const props = await buildNessusReportStaticProps();
  return {
    props,
    revalidate: 1800,
  };
};

export default NessusReportPage;
