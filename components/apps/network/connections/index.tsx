import dynamic from 'next/dynamic';

const NetworkConnectionsLazy = dynamic(
  () => import('../../../apps/network/connections'),
  {
    ssr: false,
    loading: () => <p>Loading...</p>,
  },
);

export default NetworkConnectionsLazy;
