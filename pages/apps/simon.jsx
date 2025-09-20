import dynamic from 'next/dynamic';
import { getAppSkeleton } from '../../components/app-skeletons';

const Simon = dynamic(() => import('../../apps/simon'), {
  ssr: false,
  loading: () => getAppSkeleton('simon', 'Simon'),
});

export default function SimonPage() {
  return <Simon />;
}
