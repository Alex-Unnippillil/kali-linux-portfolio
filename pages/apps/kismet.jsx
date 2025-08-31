import dynamic from '@/utils/dynamic';

const Kismet = dynamic(() => import('@/apps/kismet'), {
  ssr: false,
});

export default function KismetPage() {
  return <Kismet />;
}
