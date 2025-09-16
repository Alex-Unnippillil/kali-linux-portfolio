import { getPageMetadata } from '@/lib/metadata';
import dynamic from 'next/dynamic';
export const metadata = getPageMetadata('/apps/beef');

const Beef = dynamic(() => import('../../apps/beef'), {
  ssr: false,
  loading: () => <p>Loading...</p>,
});

export default function BeefPage() {
  return <Beef />;
}
