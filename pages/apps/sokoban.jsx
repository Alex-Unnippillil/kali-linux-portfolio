import { getPageMetadata } from '@/lib/metadata';
import React from 'react';
import dynamic from 'next/dynamic';
import { getDailySeed } from '../../utils/dailySeed';
export const metadata = getPageMetadata('/apps/sokoban');

const Sokoban = dynamic(() => import('../../apps/sokoban'), {
  ssr: false,
  loading: () => <p>Loading...</p>,
});

const SokobanPage = () => (
  <Sokoban getDailySeed={() => getDailySeed('sokoban')} />
);

export default SokobanPage;
