import dynamic from '@/utils/dynamic';

const Autopsy = dynamic(() => import('../../apps/autopsy'));

export default function AutopsyPage() {
  return <Autopsy />;
}
