import React from 'react';
import dynamic from 'next/dynamic';
import { getDailySeed } from '../../utils/dailySeed';
import { withDeepLinkBoundary } from '../../utils/deeplink';

const WordSearch = dynamic(
  () => import('../../apps/word_search'),
  { ssr: false, loading: () => <p>Loading...</p> },
);

function WordSearchPage() {
  return <WordSearch getDailySeed={() => getDailySeed('word_search')} />;
}

export default withDeepLinkBoundary('word_search', WordSearchPage);
