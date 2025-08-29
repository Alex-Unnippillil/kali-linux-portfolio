import dynamic from 'next/dynamic';

const John = dynamic(() => import('../../apps/john'), {
  ssr: false,
  loading: () => <p>Loading...</p>,
});

export default function JohnPage() {
  return <John />;
}

