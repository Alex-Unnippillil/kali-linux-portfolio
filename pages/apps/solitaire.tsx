import dynamic from 'next/dynamic';
import UbuntuWindow from '../../components/UbuntuWindow';

const Solitaire = dynamic(() => import('../../apps/solitaire'), { ssr: false });

export default function SolitairePage() {
  return (
    <UbuntuWindow title="solitaire">
      <Solitaire />
    </UbuntuWindow>
  );
}
