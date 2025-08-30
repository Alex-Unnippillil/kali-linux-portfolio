import dynamic from 'next/dynamic';

const PageX = dynamic(() => import('../../apps/x'), {
  ssr: false,
  loading: () => <p>Loading...</p>,
});

export default PageX;
