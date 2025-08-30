import dynamic from 'next/dynamic';

const TowerDefense = dynamic(() => import('../../apps/tower-defense'), {
  ssr: false,
  loading: () => <p>Loading...</p>,
});

export default TowerDefense;
