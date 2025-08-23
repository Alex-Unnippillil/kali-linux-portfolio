import dynamic from 'next/dynamic';

const CorsChecker = dynamic(() => import('../../apps/cors-checker'), { ssr: false });

export default function CorsCheckerPage() {
  return <CorsChecker />;
}

