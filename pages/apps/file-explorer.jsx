import dynamic from 'next/dynamic';

const FileExplorer = dynamic(() => import('../../components/apps/file-explorer'), {
  ssr: false,
  loading: () => <div className="flex h-full items-center justify-center">Loading Files…</div>,
});

export default function FileExplorerPage(props) {
  return <FileExplorer {...props} />;
}
