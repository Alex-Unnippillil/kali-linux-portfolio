import dynamic from 'next/dynamic';

const ResourceMonitor = dynamic(() => import('../../apps/resource-monitor'), {
  ssr: false,
});

export default function ResourceMonitorPage() {
  return <ResourceMonitor />;
}
