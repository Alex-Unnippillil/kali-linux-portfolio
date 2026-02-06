import dynamic from 'next/dynamic';

const PageSolitaire = dynamic(() => import('../../games/solitaire'), {
  ssr: false,
  loading: () => <p>Loading...</p>,
});

export default PageSolitaire;
