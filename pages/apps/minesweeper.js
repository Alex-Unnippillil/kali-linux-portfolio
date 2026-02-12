import React from 'react';
import dynamic from 'next/dynamic';

const Minesweeper = dynamic(() => import('../../components/apps/minesweeper'), {
  ssr: false,
});

export default function MinesweeperPage() {
  return <Minesweeper />;
}
