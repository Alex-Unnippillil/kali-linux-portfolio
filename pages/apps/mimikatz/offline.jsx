import dynamic from 'next/dynamic';
import { getAppSkeleton } from '../../../components/app-skeletons';

const MimikatzOffline = dynamic(() => import('../../../apps/mimikatz/offline'), {
  ssr: false,
  loading: () => getAppSkeleton('mimikatz/offline', 'Mimikatz Offline'),
});

export default function MimikatzOfflinePage() {
  return <MimikatzOffline />;
}
