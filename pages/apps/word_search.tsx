import React from 'react';
import dynamic from 'next/dynamic';
import { getDailySeed } from '../../utils/dailySeed';

const WordSearch = dynamic<{ getDailySeed?: () => Promise<string> }>(
  () => import('../../apps/word_search'),
  { ssr: false },
);

export default function WordSearchPage(): React.ReactElement {
  return <WordSearch getDailySeed={() => getDailySeed('word_search')} />;
}
