import React from 'react';
import dynamic from 'next/dynamic';
import { getDailySeed } from '../../utils/dailySeed';
import AppLoader from '../../components/AppLoader';

const Sokoban = dynamic(() => import('../../apps/sokoban'), {
  ssr: false,
  loading: () => <AppLoader />,
});

const SokobanPage: React.FC = () => (
  <Sokoban getDailySeed={() => getDailySeed('sokoban')} />
);

export default SokobanPage;
