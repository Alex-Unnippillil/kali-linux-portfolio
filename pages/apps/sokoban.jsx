import React from 'react';
import dynamic from 'next/dynamic';
import { getDailySeed } from '../../utils/dailySeed';
import { getAppSkeleton } from '../../components/app-skeletons';

const Sokoban = dynamic(() => import('../../apps/sokoban'), {
  ssr: false,
  loading: () => getAppSkeleton('sokoban', 'Sokoban'),
});

const SokobanPage = () => (
  <Sokoban getDailySeed={() => getDailySeed('sokoban')} />
);

export default SokobanPage;
