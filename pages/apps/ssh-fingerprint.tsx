import dynamic from 'next/dynamic';

const SshFingerprint = dynamic(
  () => import('../../components/apps/ssh-fingerprint'),
  { ssr: false }
);

export default function SshFingerprintPage() {
  return <SshFingerprint />;
}

