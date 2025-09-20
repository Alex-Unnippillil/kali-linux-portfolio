import { getPageMetadata } from '@/lib/metadata';
import dynamic from 'next/dynamic';
export const metadata = getPageMetadata('/apps/john');

const John = dynamic(() => import('../../apps/john'), {
  ssr: false,
  loading: () => <p>Loading...</p>,
});

export default function JohnPage() {
  return <John />;
}

