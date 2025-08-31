import dynamic from '@/utils/dynamic';

const John = dynamic(() => import('@/apps/john'), {
  ssr: false,
});

export default function JohnPage() {
  return <John />;
}

