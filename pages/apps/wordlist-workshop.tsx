import dynamic from 'next/dynamic';

const WordlistWorkshop = dynamic(() => import('../../apps/wordlist-workshop'), { ssr: false });

export default function WordlistWorkshopPage() {
  return <WordlistWorkshop />;
}
