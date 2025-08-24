import dynamic from 'next/dynamic';

const CspReporter = dynamic(() => import('@apps/csp-reporter'), { ssr: false });

export default function CspReporterPage() {
  return <CspReporter />;
}
