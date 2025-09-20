import dynamic from 'next/dynamic';
import { getAppSkeleton } from '../../components/app-skeletons';

const TowerDefense = dynamic(() => import('../../apps/tower-defense'), {
  ssr: false,
  loading: () => getAppSkeleton('tower-defense', 'Tower Defense'),
});

export default TowerDefense;
