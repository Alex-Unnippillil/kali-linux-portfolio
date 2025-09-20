import { getPageMetadata } from '@/lib/metadata';
import dynamic from 'next/dynamic';
export const metadata = getPageMetadata('/apps/spotify');

const SpotifyApp = dynamic(() => import('../../apps/spotify'), {
  ssr: false,
  loading: () => <p>Loading...</p>,
});

export default SpotifyApp;

