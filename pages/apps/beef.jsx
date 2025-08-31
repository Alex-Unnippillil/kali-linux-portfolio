import dynamic from '@/utils/dynamic';

const Beef = dynamic(() => import('@/apps/beef'), {
  ssr: false,
});

export default function BeefPage() {
  return <Beef />;
}
