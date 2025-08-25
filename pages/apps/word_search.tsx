import dynamic from 'next/dynamic';
import UbuntuWindow from '../../components/UbuntuWindow';

const WordSearch = dynamic(() => import('../../apps/word_search'), {
  ssr: false,
});

export default function WordSearchPage() {
  return (
    <UbuntuWindow title="word_search">
      <WordSearch />
    </UbuntuWindow>
  );
}
