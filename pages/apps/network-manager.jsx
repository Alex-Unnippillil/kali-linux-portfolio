import dynamic from 'next/dynamic';

const NetworkManager = dynamic(() => import('../../apps/network-manager'), {
  ssr: false,
  loading: () => <p>Loading...</p>,
});

export default function NetworkManagerPage() {
  return <NetworkManager />;
}

