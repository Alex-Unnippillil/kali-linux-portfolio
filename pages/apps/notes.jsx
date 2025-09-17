import dynamic from 'next/dynamic';

const Notes = dynamic(() => import('../../apps/notes'), {
  ssr: false,
  loading: () => <p>Loading...</p>,
});

export default function NotesPage() {
  return <Notes />;
}

