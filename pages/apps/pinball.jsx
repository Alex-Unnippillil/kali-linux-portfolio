import dynamic from '@/utils/dynamic';

const Pinball = dynamic(() => import('@/apps/pinball'), {
  ssr: false,
});

export default Pinball;
