import dynamic from 'next/dynamic';

const RemovableMediaPage = dynamic(
  () => import('../../../apps/settings/removable-media'),
  { ssr: false, loading: () => <p>Loading...</p> }
);

export default RemovableMediaPage;

