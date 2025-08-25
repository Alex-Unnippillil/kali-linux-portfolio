import dynamic from 'next/dynamic';
import UbuntuWindow from '../../components/UbuntuWindow';

const ContentFingerprint = dynamic(
  () => import('../../apps/content-fingerprint'),
  { ssr: false }
);

export default function ContentFingerprintPage() {
  return (
    <UbuntuWindow title="content fingerprint">
      <ContentFingerprint />
    </UbuntuWindow>
  );
}
