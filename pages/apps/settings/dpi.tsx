import dynamic from 'next/dynamic';

const DpiSettings = dynamic(
  () => import('../../../apps/settings/dpi'),
  { ssr: false, loading: () => <p>Loading...</p> }
);

export default DpiSettings;

