import React from 'react';
import dynamic from 'next/dynamic';
import { withDeepLinkBoundary } from '../../utils/deeplink';

const Checkers = dynamic(() => import('../../apps/checkers'), {
  ssr: false,
  loading: () => <p>Loading...</p>,
});

function CheckersPage() {
  return <Checkers />;
}

export default withDeepLinkBoundary('checkers', CheckersPage);
