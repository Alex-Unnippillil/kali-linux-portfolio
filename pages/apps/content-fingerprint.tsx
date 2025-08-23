import dynamic from 'next/dynamic';

const ContentFingerprint = dynamic(() => import('../../apps/content-fingerprint'), { ssr: false });

export default function ContentFingerprintPage() {
  return <ContentFingerprint />;
}
