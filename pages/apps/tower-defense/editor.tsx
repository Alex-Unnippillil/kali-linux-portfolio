import dynamic from 'next/dynamic';

const TowerDefenseEditor = dynamic(
  () => import('../../../apps/tower-defense/editor'),
  {
    ssr: false,
    loading: () => <p>Loading...</p>,
  }
);

export default TowerDefenseEditor;

