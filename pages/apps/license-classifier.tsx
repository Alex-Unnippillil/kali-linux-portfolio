import dynamic from 'next/dynamic';

const LicenseClassifier = dynamic(() => import('../../apps/license-classifier'), {
  ssr: false,
});

export default function LicenseClassifierPage() {
  return <LicenseClassifier />;
}

