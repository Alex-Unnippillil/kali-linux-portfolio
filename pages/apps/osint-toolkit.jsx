import dynamic from 'next/dynamic';

const OsintToolkitPreview = dynamic(() => import('../../apps/osint-toolkit'), {
  ssr: false,
  loading: () => <p>Loading...</p>,
});

export default function OsintToolkitPage() {
  return <OsintToolkitPreview />;
}
