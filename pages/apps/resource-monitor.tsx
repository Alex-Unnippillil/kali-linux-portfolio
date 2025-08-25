import dynamic from 'next/dynamic';
import UbuntuWindow from '../../components/UbuntuWindow';

const ResourceMonitor = dynamic(() => import('../../apps/resource-monitor'), {
  ssr: false,
});

export default function ResourceMonitorPage() {
  return (
    <UbuntuWindow title="resource monitor">
      <ResourceMonitor />
    </UbuntuWindow>
  );
}
