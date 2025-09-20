import dynamic from 'next/dynamic';
import { getAppSkeleton } from '../../components/app-skeletons';

const Kismet = dynamic(() => import('../../apps/kismet'), {
  ssr: false,
  loading: () => getAppSkeleton('kismet', 'Kismet'),
});

export default function KismetPage() {
  return <Kismet />;
}
