import dynamic from 'next/dynamic';

const Wordle = dynamic(() => import('../../components/apps/wordle'), {
  ssr: false,
  loading: () => <p>Loading...</p>,
});

export default function WordlePage() {
  return <Wordle />;
}

