import dynamic from 'next/dynamic';

const NetworkConnections = dynamic(() => import('../../../apps/network/connections'), {
  ssr: false,
  loading: () => <p>Loading...</p>,
});

export default NetworkConnections;
