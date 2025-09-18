import dynamic from 'next/dynamic';

const UpdateCenterApp = dynamic(() => import('../../apps/update-center'), {
  ssr: false,
  loading: () => <p>Loading...</p>,
});

export default function UpdateCenterPage() {
  return <UpdateCenterApp />;
}
