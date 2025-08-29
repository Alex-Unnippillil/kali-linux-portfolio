import React from 'react';
import dynamic from 'next/dynamic';

const YouTubeApp = dynamic(() => import('../../apps/youtube'), {
  ssr: false,
  loading: () => <p>Loading...</p>,
});

export default YouTubeApp;
