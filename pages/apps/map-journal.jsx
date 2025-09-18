import dynamic from 'next/dynamic';

const MapJournalApp = dynamic(() => import('../../apps/map-journal'), {
  ssr: false,
  loading: () => <p>Loading...</p>,
});

export default function MapJournalPage() {
  return <MapJournalApp />;
}
