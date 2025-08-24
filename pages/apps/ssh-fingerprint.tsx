import dynamic from 'next/dynamic';

const SshFingerprint = dynamic(
  () => import('../../apps/ssh-fingerprint'),
  { ssr: false }
);

export default function SshFingerprintPage() {
  return <SshFingerprint />;
}

