import dynamic from '@/utils/dynamic';

const Simon = dynamic(() => import('@/apps/simon'), {
  ssr: false,
});

export default function SimonPage() {
  return <Simon />;
}
