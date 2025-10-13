import dynamic from 'next/dynamic';

const MimikatzOffline = dynamic(() => import('../../../apps/mimikatz/offline'), {
  ssr: false,
  loading: () => <p>Loading...</p>,
});

export default function MimikatzOfflinePage() {
  return <MimikatzOffline />;
}
