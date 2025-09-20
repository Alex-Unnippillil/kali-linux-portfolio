import dynamic from 'next/dynamic';
import { getAppSkeleton } from '../../components/app-skeletons';

const SpotifyApp = dynamic(() => import('../../apps/spotify'), {
  ssr: false,
  loading: () => getAppSkeleton('spotify', 'Spotify'),
});

export default SpotifyApp;
