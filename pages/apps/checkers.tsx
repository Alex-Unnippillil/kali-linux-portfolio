import React from 'react';
import dynamic from 'next/dynamic';

const Checkers = dynamic(() => import('../../apps/checkers'), {
  ssr: false,
  loading: () => <p>Loading...</p>,
});

export default function CheckersPage(): React.ReactElement {
  return <Checkers />;
}
