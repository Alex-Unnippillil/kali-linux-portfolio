import { getPageMetadata } from '@/lib/metadata';
import React from 'react';
import dynamic from 'next/dynamic';
import { getDailySeed } from '../../utils/dailySeed';
export const metadata = getPageMetadata('/apps/word_search');

const WordSearch = dynamic(
  () => import('../../apps/word_search'),
  { ssr: false, loading: () => <p>Loading...</p> },
);

export default function WordSearchPage() {
  return <WordSearch getDailySeed={() => getDailySeed('word_search')} />;
}
