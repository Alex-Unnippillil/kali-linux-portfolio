import dynamic from '@/utils/dynamic';

const HTTPPreview = dynamic(() => import('../../apps/http'));

export default function HTTPPage() {
  return <HTTPPreview />;
}
