import dynamic from 'next/dynamic';

const AsciiArt = dynamic(() => import('../../apps/ascii-art'), {
  ssr: false,
  loading: () => <p>Loading...</p>,
});

export default AsciiArt;
