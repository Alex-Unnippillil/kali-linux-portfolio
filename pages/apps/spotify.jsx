import dynamic from '@/utils/dynamic';

const SpotifyApp = dynamic(() => import('@/apps/spotify'), {
  ssr: false,
});

export default SpotifyApp;

