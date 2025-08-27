import React from 'react';
import dynamic from 'next/dynamic';

const Sokoban = dynamic(() => import('../../apps/sokoban'), {
  ssr: false,
  loading: () => <p>Loading...</p>,
});

export default function SokobanPage() {
  return <Sokoban />;
}
