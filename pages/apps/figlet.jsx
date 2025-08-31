import dynamic from '@/utils/dynamic';

const FigletPage = dynamic(() => import('@/apps/figlet'), {
  ssr: false,
});

export default FigletPage;
