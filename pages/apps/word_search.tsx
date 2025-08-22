import dynamic from 'next/dynamic';

const WordSearch = dynamic(() => import('../../apps/word_search'), { ssr: false });

export default function WordSearchPage() {
  return <WordSearch />;
}
