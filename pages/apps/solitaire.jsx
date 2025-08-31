import dynamic from '@/utils/dynamic';

const PageSolitaire = dynamic(() => import('@/apps/solitaire'), {
  ssr: false,
});

export default PageSolitaire;
