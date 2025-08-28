import dynamic from 'next/dynamic';

const Page2048 = dynamic(() => import('../../apps/2048'), {
  ssr: false,
  loading: () => <p>Loading...</p>,
});

export default Page2048;
