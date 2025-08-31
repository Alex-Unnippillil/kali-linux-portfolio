import dynamic from '@/utils/dynamic';

const Autopsy = dynamic(() => import('@/apps/autopsy'), {
  ssr: false,
});

export default function AutopsyPage() {
  return <Autopsy />;
}
