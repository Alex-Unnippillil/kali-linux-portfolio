import dynamic from 'next/dynamic';

const TextToAsciiPage = dynamic(() => import('../../apps/text-to-ascii'), {
  ssr: false,
  loading: () => <p>Loading...</p>,
});

export default TextToAsciiPage;
