import dynamic from 'next/dynamic';

const FigletPage = dynamic(() => import('../../apps/figlet'), {
  ssr: false,
  loading: () => <p>Loading...</p>,
});

export default FigletPage;
