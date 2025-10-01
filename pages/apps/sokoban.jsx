import React from 'react';
import dynamic from 'next/dynamic';
import { getDailySeed } from '../../utils/dailySeed';
import { withDeepLinkBoundary } from '../../utils/deeplink';

const Sokoban = dynamic(() => import('../../apps/sokoban'), {
  ssr: false,
  loading: () => <p>Loading...</p>,
});

const SokobanPage = () => (
  <Sokoban getDailySeed={() => getDailySeed('sokoban')} />
);

export default withDeepLinkBoundary('sokoban', SokobanPage);