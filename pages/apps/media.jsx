import dynamic from 'next/dynamic';

const MediaApp = dynamic(() => import('../../apps/media'), {
  ssr: false,
  loading: () => <p>Loading...</p>,
});

export default MediaApp;
