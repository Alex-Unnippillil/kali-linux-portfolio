import dynamic from 'next/dynamic';
import { getAppSkeleton } from '../../components/app-skeletons';

const SSHPreview = dynamic(() => import('../../apps/ssh'), {
  ssr: false,
  loading: () => getAppSkeleton('ssh', 'SSH'),
});

export default function SSHPage() {
  return <SSHPreview />;
}
