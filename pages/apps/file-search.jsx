import dynamic from 'next/dynamic';

const FileSearch = dynamic(() => import('../../components/apps/file-search'), {
  ssr: false,
  loading: () => <p>Loading...</p>,
});

export default function FileSearchPage() {
  return <FileSearch />;
}

