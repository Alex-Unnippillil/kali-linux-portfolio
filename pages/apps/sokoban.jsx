import React from 'react';
import dynamic from '@/utils/dynamic';
import { getDailySeed } from '../../utils/dailySeed';

const Sokoban = dynamic(() => import('../../apps/sokoban'));

const SokobanPage = () => (
  <Sokoban getDailySeed={() => getDailySeed('sokoban')} />
);

export default SokobanPage;
