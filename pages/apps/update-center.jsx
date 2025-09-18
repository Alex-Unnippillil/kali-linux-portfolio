import dynamic from 'next/dynamic';

const UpdateCenterApp = dynamic(() => import('../../apps/update-center'), { ssr: false });

export default function UpdateCenterPage() {
  return <UpdateCenterApp />;
}
