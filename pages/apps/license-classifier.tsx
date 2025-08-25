import dynamic from 'next/dynamic';
import UbuntuWindow from '../../components/UbuntuWindow';

const LicenseClassifier = dynamic(
  () => import('../../apps/license-classifier'),
  { ssr: false }
);

export default function LicenseClassifierPage() {
  return (
    <UbuntuWindow title="license classifier">
      <LicenseClassifier />
    </UbuntuWindow>
  );
}
