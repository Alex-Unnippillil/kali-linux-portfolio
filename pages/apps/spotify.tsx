import dynamic from 'next/dynamic';

const SpotifyApp = dynamic(() => import('../../apps/spotify'), {
  ssr: false,
  loading: () => <p>Loading...</p>,
});

export default SpotifyApp;

