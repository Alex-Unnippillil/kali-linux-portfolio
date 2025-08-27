import dynamic from 'next/dynamic';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import { getDailySeed } from '../../utils/dailySeed';

const WordSearch = dynamic<{ seed: string }>(
  () => import('../../apps/word_search'),
  { ssr: false },
);

export default function WordSearchPage(): JSX.Element {
  const { query } = useRouter();
  const [seed, setSeed] = useState<string | null>(null);

  useEffect(() => {
    const init = async () => {
      const s =
        typeof query.seed === 'string'
          ? query.seed
          : await getDailySeed('word_search');
      setSeed(s);
    };
    void init();
  }, [query.seed]);

  if (!seed) return <></>;

  return <WordSearch seed={seed} />;
}
