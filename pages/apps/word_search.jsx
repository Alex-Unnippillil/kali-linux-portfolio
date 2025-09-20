import React from 'react';
import dynamic from 'next/dynamic';
import { getDailySeed } from '../../utils/dailySeed';
import { getAppSkeleton } from '../../components/app-skeletons';

const WordSearch = dynamic(
  () => import('../../apps/word_search'),
  {
    ssr: false,
    loading: () => getAppSkeleton('word_search', 'Word Search'),
  },
);

export default function WordSearchPage() {
  return <WordSearch getDailySeed={() => getDailySeed('word_search')} />;
}
