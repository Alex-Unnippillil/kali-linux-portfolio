import dynamic from 'next/dynamic';
import { getAppSkeleton } from '../../components/app-skeletons';

const HTTPPreview = dynamic(() => import('../../apps/http'), {
  ssr: false,
  loading: () => getAppSkeleton('http', 'HTTP'),
});

export default function HTTPPage() {
  return <HTTPPreview />;
}
