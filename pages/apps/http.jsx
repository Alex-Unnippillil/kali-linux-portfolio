import { getPageMetadata } from '@/lib/metadata';
import dynamic from 'next/dynamic';
export const metadata = getPageMetadata('/apps/http');

const HTTPPreview = dynamic(() => import('../../apps/http'), {
  ssr: false,
  loading: () => <p>Loading...</p>,
});

export default function HTTPPage() {
  return <HTTPPreview />;
}
