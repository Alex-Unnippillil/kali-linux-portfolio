import dynamic from 'next/dynamic';

const MetadataPeekApp = dynamic(() => import('../../apps/metadata-peek'), {
  ssr: false,
  loading: () => <p>Loading...</p>,
});

export default function MetadataPeekPage() {
  return <MetadataPeekApp />;
}
