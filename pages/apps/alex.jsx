import dynamic from 'next/dynamic';

const PageAlex = dynamic(() => import('../../apps/alex'), {
  ssr: false,
  loading: () => <p>Loading...</p>,
});

export default PageAlex;
