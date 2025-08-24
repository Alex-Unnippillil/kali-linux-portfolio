import dynamic from 'next/dynamic';

const PrefetchJumpList = dynamic(() => import('../../apps/prefetch-jumplist'), { ssr: false });

export default function PrefetchJumpListPage() {
  return <PrefetchJumpList />;
}
