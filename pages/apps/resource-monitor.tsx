import dynamic from 'next/dynamic';

const ResourceMonitor = dynamic(() => import('../../apps/resource-monitor'), {
  ssr: false,
  loading: () => <p>Loading...</p>,
});

export default function ResourceMonitorPage() {
  return <ResourceMonitor />;
}
