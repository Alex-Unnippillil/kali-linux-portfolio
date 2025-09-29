import dynamic from '@/utils/dynamic';

const Simon = dynamic(() => import('../../apps/simon'));

export default function SimonPage() {
  return <Simon />;
}
