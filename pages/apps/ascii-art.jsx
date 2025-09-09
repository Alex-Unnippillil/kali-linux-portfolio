import dynamic from 'next/dynamic';

const AsciiArtPage = dynamic(() => import('../../apps/ascii-art'), {
  ssr: false,
  loading: () => <p>Loading...</p>,
});

export default AsciiArtPage;
