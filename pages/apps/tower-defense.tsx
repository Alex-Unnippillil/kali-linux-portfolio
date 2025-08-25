import dynamic from 'next/dynamic';
import UbuntuWindow from '../../components/UbuntuWindow';

const TowerDefense = dynamic(() => import('../../apps/tower-defense'), {
  ssr: false,
});

export default function TowerDefensePage() {
  return (
    <UbuntuWindow title="tower defense">
      <TowerDefense />
    </UbuntuWindow>
  );
}
