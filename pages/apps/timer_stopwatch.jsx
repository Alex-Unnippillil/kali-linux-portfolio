import { getPageMetadata } from '@/lib/metadata';
import dynamic from 'next/dynamic';
export const metadata = getPageMetadata('/apps/timer_stopwatch');

const TimerStopwatch = dynamic(() => import('../../apps/timer_stopwatch'), {
  ssr: false,
  loading: () => <p>Loading...</p>,
});

export default function TimerStopwatchPage() {
  return <TimerStopwatch />;
}

