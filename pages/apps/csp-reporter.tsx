import dynamic from 'next/dynamic';
import UbuntuWindow from '../../components/UbuntuWindow';

const CspReporter = dynamic(() => import('../../apps/csp-reporter'), {
  ssr: false,
});

export default function CspReporterPage() {
  return (
    <UbuntuWindow title="csp reporter">
      <CspReporter />
    </UbuntuWindow>
  );
}
