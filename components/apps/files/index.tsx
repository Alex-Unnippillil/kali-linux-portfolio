import dynamic from 'next/dynamic';

const FilesApp = dynamic(() => import('../../../apps/files'), {
  ssr: false,
  loading: () => <p>Loading...</p>,
});

export default FilesApp;
