import { getDailySeed } from '../../utils/dailySeed';
import createSuspenseAppPage from '../../utils/createSuspenseAppPage';

const WordSearch = createSuspenseAppPage(
  () => import('../../apps/word_search'),
  {
    appName: 'Word Search',
  },
);

export default function WordSearchPage() {
  return <WordSearch getDailySeed={() => getDailySeed('word_search')} />;
}
