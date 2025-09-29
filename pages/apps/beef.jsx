import dynamic from '@/utils/dynamic';

const Beef = dynamic(() => import('../../apps/beef'));

export default function BeefPage() {
  return <Beef />;
}
