import React from 'react';
import dynamic from '@/utils/dynamic';

const Checkers = dynamic(() => import('../../apps/checkers'));

export default function CheckersPage() {
  return <Checkers />;
}
