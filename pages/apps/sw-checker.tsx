import dynamic from 'next/dynamic';

const SwChecker = dynamic(() => import('../../apps/sw-checker'), { ssr: false });

export default function SwCheckerPage() {
  return <SwChecker />;
}

