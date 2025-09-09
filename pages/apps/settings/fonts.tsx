import dynamic from 'next/dynamic';

const FontsSettings = dynamic(
  () => import('../../../apps/settings/fonts'),
  { ssr: false, loading: () => <p>Loading...</p> }
);

export default FontsSettings;

