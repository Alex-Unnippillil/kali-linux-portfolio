import dynamic from '@/utils/dynamic';

const TowerDefense = dynamic(() => import('@/apps/tower-defense'), {
  ssr: false,
});

export default TowerDefense;
