import dynamic from 'next/dynamic';

const CaaChecker = dynamic(() => import('../../apps/caa-checker'), {
  ssr: false,
});

export default function CaaCheckerPage() {
  return <CaaChecker />;
}
