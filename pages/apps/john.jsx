import dynamic from '@/utils/dynamic';

const John = dynamic(() => import('../../apps/john'));

export default function JohnPage() {
  return <John />;
}

