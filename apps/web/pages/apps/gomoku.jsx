import dynamic from 'next/dynamic';

const GomokuPage = dynamic(() => import('../../components/apps/gomoku'), {
  ssr: false,
  loading: () => <p>Loading...</p>,
});

export default GomokuPage;
