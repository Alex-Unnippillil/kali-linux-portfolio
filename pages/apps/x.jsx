import dynamic from 'next/dynamic';
import { getAppSkeleton } from '../../components/app-skeletons';

const PageX = dynamic(() => import('../../apps/x'), {
  ssr: false,
  loading: () => getAppSkeleton('x', 'X Timeline'),
});

export default PageX;
