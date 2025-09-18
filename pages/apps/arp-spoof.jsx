import dynamic from 'next/dynamic';

const ArpSpoof = dynamic(() => import('../../apps/arp-spoof'), {
  ssr: false,
  loading: () => <p>Loading...</p>,
});

const ArpSpoofRoute = () => <ArpSpoof />;

export default ArpSpoofRoute;
