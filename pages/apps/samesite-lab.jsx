import dynamic from 'next/dynamic';

const SameSiteLabApp = dynamic(() => import('../../apps/samesite-lab'), {
  ssr: false,
  loading: () => <p>Loading...</p>,
});

export default function SameSiteLabPage() {
  return <SameSiteLabApp />;
}
