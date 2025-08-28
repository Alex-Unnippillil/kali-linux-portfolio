import React from 'react';
import dynamic from 'next/dynamic';
import AppLoader from '../../components/AppLoader';

const Checkers = dynamic(() => import('../../apps/checkers'), {
  ssr: false,
  loading: () => <AppLoader />,
});

export default function CheckersPage(): React.ReactElement {
  return <Checkers />;
}
