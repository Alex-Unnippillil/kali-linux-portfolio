import dynamic from 'next/dynamic';

const CspReporterApp = dynamic(() => import('../../apps/csp-reporter'), {
  ssr: false,
  loading: () => <p>Loading...</p>,
});

export default function CspReporterPage() {
  return <CspReporterApp />;
}
