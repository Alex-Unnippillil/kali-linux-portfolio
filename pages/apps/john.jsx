import dynamic from 'next/dynamic';
import { getAppSkeleton } from '../../components/app-skeletons';

const John = dynamic(() => import('../../apps/john'), {
  ssr: false,
  loading: () => getAppSkeleton('john', 'John the Ripper'),
});

export default function JohnPage() {
  return <John />;
}
