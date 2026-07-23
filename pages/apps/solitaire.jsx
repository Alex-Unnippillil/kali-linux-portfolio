import dynamic from 'next/dynamic';

const PageSolitaire = dynamic(() => import('../../apps/solitaire'), {
  ssr: false,
  loading: () => <p>Loading...</p>,
});

export default PageSolitaire;
