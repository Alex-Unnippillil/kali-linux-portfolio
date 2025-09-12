import dynamic from 'next/dynamic';

const SoftwareCenterPage = dynamic(() => import('../../apps/software-center'), {
  ssr: false,
  loading: () => <p>Loading...</p>,
});

export default SoftwareCenterPage;

