import dynamic from 'next/dynamic';

const TimelineBuilder = dynamic(() => import('../../components/apps/timeline-builder'), { ssr: false });

export default function TimelineBuilderPage() {
  return <TimelineBuilder />;
}

