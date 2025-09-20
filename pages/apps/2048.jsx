import dynamic from 'next/dynamic';
import { getAppSkeleton } from '../../components/app-skeletons';

const Page2048 = dynamic(() => import('../../apps/2048'), {
  ssr: false,
  loading: () => getAppSkeleton('2048', '2048'),
});

export default Page2048;
