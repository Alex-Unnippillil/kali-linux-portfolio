import dynamic from 'next/dynamic';

const FileExplorer = dynamic(() => import('../../components/apps/file-explorer'), {
  ssr: false,
  loading: () => (
    <div className="flex h-screen items-center justify-center bg-ub-cool-grey text-white">
      Loading Files...
    </div>
  ),
});

export default function FilesPage(props) {
  return (
    <main className="min-h-screen bg-ub-cool-grey text-white">
      <FileExplorer {...props} />
    </main>
  );
}
