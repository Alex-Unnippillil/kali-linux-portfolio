import dynamic from 'next/dynamic';

const DiskManager = dynamic(() => import('../../components/apps/disk-manager'), {
  ssr: false,
  loading: () => <p>Loading...</p>,
});

export default DiskManager;
