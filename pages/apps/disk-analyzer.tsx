import dynamic from 'next/dynamic';

const DiskAnalyzerPage = dynamic(
  () =>
    import('../../apps/disk-analyzer').catch((err) => {
      console.error('Failed to load Disk Analyzer app', err);
      throw err;
    }),
  {
    ssr: false,
    loading: () => <p>Loading Disk Analyzer...</p>,
  },
);

export default DiskAnalyzerPage;
