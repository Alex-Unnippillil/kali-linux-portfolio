import dynamic from 'next/dynamic';

const Pavucontrol = dynamic(() => import('../../apps/pavucontrol'), {
  ssr: false,
  loading: () => <p>Loading...</p>,
});

export default Pavucontrol;
