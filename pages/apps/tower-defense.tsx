import dynamic from 'next/dynamic';

const TowerDefense = dynamic(() => import('../../apps/tower-defense'), { ssr: false });

export default function TowerDefensePage() {
  return <TowerDefense />;
}
