import dynamic from 'next/dynamic';
import UbuntuWindow from '../../components/UbuntuWindow';

const WordlistWorkshop = dynamic(() => import('../../apps/wordlist-workshop'), {
  ssr: false,
});

export default function WordlistWorkshopPage() {
  return (
    <UbuntuWindow title="wordlist workshop">
      <WordlistWorkshop />
    </UbuntuWindow>
  );
}
