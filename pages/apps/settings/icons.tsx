import dynamic from 'next/dynamic';

const IconsSettings = dynamic(
  () => import('../../../apps/settings/icons'),
  { ssr: false, loading: () => <p>Loading...</p> }
);

export default IconsSettings;

