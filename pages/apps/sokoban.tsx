import React from 'react';
import dynamic from 'next/dynamic';
import { getDailySeed } from '../../utils/dailySeed';

const Sokoban = dynamic<{ getDailySeed?: () => Promise<string> }>(
  () => import('../../components/apps/sokoban'),
  {
    ssr: false,
    loading: () => <p>Loading...</p>,
  },
);

const SokobanPage: React.FC = () => (
  <Sokoban getDailySeed={() => getDailySeed('sokoban')} />
);

export default SokobanPage;
