import dynamic from 'next/dynamic';

const ConnectFour = dynamic(() => import('../../apps/connect-four'), {
  ssr: false,
  loading: () => <p>Loading...</p>,
});

export default ConnectFour;
