import dynamic from '@/utils/dynamic';

const ConnectFour = dynamic(() => import('@/apps/connect-four'), {
  ssr: false,
});

export default ConnectFour;
