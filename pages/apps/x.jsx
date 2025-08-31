import dynamic from '@/utils/dynamic';

const PageX = dynamic(() => import('@/apps/x'), {
  ssr: false,
});

export default PageX;
