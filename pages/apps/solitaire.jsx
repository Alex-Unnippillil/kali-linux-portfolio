import dynamic from 'next/dynamic';
import { getAppSkeleton } from '../../components/app-skeletons';

const PageSolitaire = dynamic(() => import('../../apps/solitaire'), {
  ssr: false,
  loading: () => getAppSkeleton('solitaire', 'Solitaire'),
});

export default PageSolitaire;
