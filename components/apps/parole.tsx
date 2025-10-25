import dynamic from 'next/dynamic';

// Lightweight wrapper that dynamically loads the Parole player
// implemented in src/apps/parole. This keeps initial bundle size small.
const ParoleApp = dynamic(() => import('../../src/apps/parole'), {
  ssr: false,
  loading: () => <p>Loading...</p>,
});

export default ParoleApp;
