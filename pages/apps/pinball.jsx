import dynamic from 'next/dynamic';
import { getAppSkeleton } from '../../components/app-skeletons';

const Pinball = dynamic(() => import('../../apps/pinball'), {
  ssr: false,
  loading: () => getAppSkeleton('pinball', 'Pinball'),
});

export default Pinball;
