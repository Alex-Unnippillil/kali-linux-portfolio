import Head from 'next/head';
import dynamic from 'next/dynamic';

const CspReporter = dynamic(() => import('@apps/csp-reporter'), { ssr: false });

export default function CspReporterPage() {
  return (
    <>
      <Head>
        <title>CSP Reporter</title>
        <meta
          name="description"
          content="Live dashboard for Content Security Policy violation reports"
        />
      </Head>
      <CspReporter />
    </>
  );
}
