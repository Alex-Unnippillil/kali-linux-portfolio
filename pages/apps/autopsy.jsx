import dynamic from 'next/dynamic';

const Autopsy = dynamic(() => import('../../apps/autopsy'), {
  ssr: false,
  loading: () => <p>Loading...</p>,
});

export default function AutopsyPage() {
  return <Autopsy />;
}
