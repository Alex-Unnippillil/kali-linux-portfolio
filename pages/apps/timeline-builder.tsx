import dynamic from 'next/dynamic';
import UbuntuWindow from '../../components/UbuntuWindow';

const TimelineBuilder = dynamic(() => import('../../apps/timeline-builder'), {
  ssr: false,
});

export default function TimelineBuilderPage() {
  return (
    <UbuntuWindow title="timeline builder">
      <TimelineBuilder />
    </UbuntuWindow>
  );
}
