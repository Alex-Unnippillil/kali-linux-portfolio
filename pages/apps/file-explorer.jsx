import dynamic from 'next/dynamic';

const FileExplorer = dynamic(() => import('../../apps/file-explorer'), {
  ssr: false,
  loading: () => <p>Loading...</p>,
});

export default function FileExplorerPage() {
  return <FileExplorer />;
}
