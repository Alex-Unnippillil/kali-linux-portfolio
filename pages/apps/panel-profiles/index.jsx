import dynamic from 'next/dynamic';

const PanelProfiles = dynamic(() => import('../../../apps/panel-profiles'), {
  ssr: false,
  loading: () => <p>Loading...</p>,
});

export default function PanelProfilesPage() {
  return <PanelProfiles />;
}
