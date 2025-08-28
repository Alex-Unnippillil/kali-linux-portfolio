import dynamic from 'next/dynamic';
import AppLoader from '../../components/AppLoader';

const Page2048 = dynamic(() => import('../../apps/2048'), {
  ssr: false,
  loading: () => <AppLoader />,
});

export default Page2048;
