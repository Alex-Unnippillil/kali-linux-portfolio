import dynamic from 'next/dynamic';

const CalendarApp = dynamic(() => import('../../apps/calendar'), {
  ssr: false,
  loading: () => <p>Loading calendar...</p>,
});

export default function CalendarPage() {
  return <CalendarApp />;
}
