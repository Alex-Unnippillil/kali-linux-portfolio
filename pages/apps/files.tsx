import dynamic from 'next/dynamic';

const FilesApp = dynamic(() => import('../../components/apps/files'), {
  ssr: false,
  loading: () => <p>Loading...</p>,
});

export default function FilesPage() {
  return <FilesApp />;
}
