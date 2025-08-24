import dynamic from 'next/dynamic';

const CachePolicy = dynamic(() => import('../../apps/cache-policy'), {
  ssr: false,
});

export default function CachePolicyPage() {
  return <CachePolicy />;
}

