import dynamic from 'next/dynamic';

const FilesPage = dynamic(() => import('../../components/apps/file-explorer'), {
  ssr: false,
  loading: () => <p>Loading...</p>,
});

export default FilesPage;
