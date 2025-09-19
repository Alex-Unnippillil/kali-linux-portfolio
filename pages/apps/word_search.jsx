import React from 'react';
import dynamic from 'next/dynamic';
import { getDailySeed } from '@/utils';

const WordSearch = dynamic(
  () => import('../../apps/word_search'),
  { ssr: false, loading: () => <p>Loading...</p> },
);

export default function WordSearchPage() {
  return <WordSearch getDailySeed={() => getDailySeed('word_search')} />;
}
