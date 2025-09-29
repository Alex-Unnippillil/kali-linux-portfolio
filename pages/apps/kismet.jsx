import dynamic from '@/utils/dynamic';

const Kismet = dynamic(() => import('../../apps/kismet'));

export default function KismetPage() {
  return <Kismet />;
}
