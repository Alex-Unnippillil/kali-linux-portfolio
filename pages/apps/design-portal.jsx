import dynamic from 'next/dynamic';

const DesignPortal = dynamic(() => import('../../apps/design-portal'), {
  ssr: false,
  loading: () => <p>Loading design portal…</p>,
});

export default DesignPortal;
