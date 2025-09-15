import dynamic from 'next/dynamic';
import results from '../../data/network-scanner.json';

const NetworkScannerApp = dynamic(
  () => import('../../components/apps/network-scanner'),
  {
    ssr: false,
    loading: () => <p>Loading...</p>,
  },
);

const NetworkScannerPage = () => {
  return <NetworkScannerApp results={results} />;
};

export default NetworkScannerPage;

