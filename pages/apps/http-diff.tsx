import dynamic from 'next/dynamic';

const HttpDiff = dynamic(() => import('../../apps/http-diff'), { ssr: false });

export default function HttpDiffPage() {
  return <HttpDiff />;
}

