import React from 'react';
import dynamic from 'next/dynamic';
import GameLayout from '../../components/apps/GameLayout';

const Sokoban = dynamic(() => import('../../apps/sokoban'), {
  ssr: false,
  loading: () => <p>Loading...</p>,
});

const SokobanPage: React.FC = () => (
  <GameLayout gameId="sokoban">
    <Sokoban />
  </GameLayout>
);

export default SokobanPage;
