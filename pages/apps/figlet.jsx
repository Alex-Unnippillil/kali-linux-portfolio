import dynamic from 'next/dynamic';
import { getAppSkeleton } from '../../components/app-skeletons';

const FigletPage = dynamic(() => import('../../apps/figlet'), {
  ssr: false,
  loading: () => getAppSkeleton('figlet', 'Figlet'),
});

export default FigletPage;
