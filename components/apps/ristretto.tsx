import dynamic from 'next/dynamic';

// Wrapper that lazy-loads the Ristretto image viewer from src/apps/ristretto.
const RistrettoApp = dynamic(() => import('../../src/apps/ristretto'), {
  ssr: false,
  loading: () => <p>Loading...</p>,
});

export default RistrettoApp;
