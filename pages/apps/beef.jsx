import dynamic from 'next/dynamic';
import { getAppSkeleton } from '../../components/app-skeletons';

const Beef = dynamic(() => import('../../apps/beef'), {
  ssr: false,
  loading: () => getAppSkeleton('beef', 'BeEF'),
});

export default function BeefPage() {
  return <Beef />;
}
