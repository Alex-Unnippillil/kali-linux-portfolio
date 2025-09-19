import dynamic from 'next/dynamic';
import SimulatorSkeleton from '../../components/skeletons/SimulatorSkeleton';

const John = dynamic(() => import('../../apps/john'), {
  ssr: false,
  loading: () => <SimulatorSkeleton />,
});

export default function JohnPage() {
  return <John />;
}
