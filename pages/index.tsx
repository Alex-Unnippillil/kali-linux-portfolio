import React, { Suspense } from 'react';
import dynamic from 'next/dynamic';
import Meta from '../components/SEO/Meta';

const Ubuntu = dynamic(() => import('../components/ubuntu'), {
  ssr: false,
});

const App: React.FC = () => (
  <>
    <Meta />
    <Suspense fallback={<div className="w-screen h-screen bg-gray-900 animate-pulse" />}>
      <Ubuntu />
    </Suspense>
  </>
);

export default App;
