import dynamic from 'next/dynamic';

const DiskAnalyzerApp = dynamic(() => import('../../apps/disk-analyzer'), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full items-center justify-center bg-ub-cool-grey text-white">
      Loading Disk Analyzer...
    </div>
  ),
});

export default DiskAnalyzerApp;

export const displayDiskAnalyzer = () => <DiskAnalyzerApp />;
