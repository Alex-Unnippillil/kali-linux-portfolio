import dynamic from 'next/dynamic';

const HTTPPreview = dynamic(() => import('../../apps/http'), { ssr: false });

export default function HTTPPage() {
  return <HTTPPreview />;
}
