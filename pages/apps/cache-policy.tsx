import dynamic from 'next/dynamic';

const CachePolicy = dynamic(() => import('../../components/apps/cache-policy'), {
  ssr: false,
});

export default function CachePolicyPage() {
  return <CachePolicy />;
}

