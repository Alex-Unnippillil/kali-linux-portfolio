import dynamic from '@/utils/dynamic';

const MimikatzOffline = dynamic(() => import('../../../apps/mimikatz/offline'));

export default function MimikatzOfflinePage() {
  return <MimikatzOffline />;
}
