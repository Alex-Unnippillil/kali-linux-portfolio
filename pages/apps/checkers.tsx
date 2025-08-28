import React from 'react';
import dynamic from 'next/dynamic';

const Checkers = dynamic(() => import('../../apps/checkers'), { ssr: false });

export default function CheckersPage(): React.ReactElement {
  return <Checkers />;
}
