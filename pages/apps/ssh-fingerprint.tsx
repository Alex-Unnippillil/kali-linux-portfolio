import dynamic from 'next/dynamic';
import UbuntuWindow from '../../components/UbuntuWindow';

const SshFingerprint = dynamic(() => import('../../apps/ssh-fingerprint'), {
  ssr: false,
});

export default function SshFingerprintPage() {
  return (
    <UbuntuWindow title="ssh fingerprint">
      <SshFingerprint />
    </UbuntuWindow>
  );
}
