import { getPageMetadata } from '@/lib/metadata';
import dynamic from 'next/dynamic';
export const metadata = getPageMetadata('/apps/ssh');

const SSHPreview = dynamic(() => import('../../apps/ssh'), {
  ssr: false,
  loading: () => <p>Loading...</p>,
});

export default function SSHPage() {
  return <SSHPreview />;
}
