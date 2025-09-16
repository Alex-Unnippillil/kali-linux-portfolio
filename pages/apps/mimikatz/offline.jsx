import { getPageMetadata } from '@/lib/metadata';
import dynamic from 'next/dynamic';
export const metadata = getPageMetadata('/apps/mimikatz/offline');

const MimikatzOffline = dynamic(() => import('../../../apps/mimikatz/offline'), {
  ssr: false,
  loading: () => <p>Loading...</p>,
});

export default function MimikatzOfflinePage() {
  return <MimikatzOffline />;
}
