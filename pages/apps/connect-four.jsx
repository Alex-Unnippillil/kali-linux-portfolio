import dynamic from 'next/dynamic';
import { getAppSkeleton } from '../../components/app-skeletons';

const ConnectFour = dynamic(() => import('../../apps/connect-four'), {
  ssr: false,
  loading: () => getAppSkeleton('connect-four', 'Connect Four'),
});

export default ConnectFour;
