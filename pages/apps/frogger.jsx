import dynamic from 'next/dynamic';

const FroggerPage = dynamic(() => import('../../components/apps/frogger'), {
  ssr: false,
  loading: () => <p>Loading...</p>,
});

export default FroggerPage;
