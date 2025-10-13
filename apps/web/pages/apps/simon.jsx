import dynamic from 'next/dynamic';

const Simon = dynamic(() => import('../../apps/simon'), {
  ssr: false,
  loading: () => <p>Loading...</p>,
});

export default function SimonPage() {
  return <Simon />;
}
