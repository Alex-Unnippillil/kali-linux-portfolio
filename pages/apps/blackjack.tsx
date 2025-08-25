import dynamic from 'next/dynamic';
import UbuntuWindow from '../../components/UbuntuWindow';

const Blackjack = dynamic(() => import('../../apps/blackjack'), { ssr: false });

export default function BlackjackPage() {
  return (
    <UbuntuWindow title="blackjack">
      <Blackjack />
    </UbuntuWindow>
  );
}
