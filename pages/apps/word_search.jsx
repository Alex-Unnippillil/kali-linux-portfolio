import React from 'react';
import dynamic from '@/utils/dynamic';
import { getDailySeed } from '../../utils/dailySeed';

const WordSearch = dynamic(
  () => import('@/apps/word_search'),
   loading: () => <p>Loading...</p> },
);

export default function WordSearchPage() {
  return <WordSearch getDailySeed={() => getDailySeed('word_search')} />;
}
