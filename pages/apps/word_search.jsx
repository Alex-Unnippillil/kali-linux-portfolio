import React from 'react';
import dynamic from '@/utils/dynamic';
import { getDailySeed } from '../../utils/dailySeed';

const WordSearch = dynamic(() => import('../../apps/word_search'));

export default function WordSearchPage() {
  return <WordSearch getDailySeed={() => getDailySeed('word_search')} />;
}
