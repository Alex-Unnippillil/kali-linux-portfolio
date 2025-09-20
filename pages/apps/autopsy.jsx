import dynamic from 'next/dynamic';
import { getAppSkeleton } from '../../components/app-skeletons';

const Autopsy = dynamic(() => import('../../apps/autopsy'), {
  ssr: false,
  loading: () => getAppSkeleton('autopsy', 'Autopsy'),
});

export default function AutopsyPage() {
  return <Autopsy />;
}
