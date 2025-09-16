import dynamic from 'next/dynamic';
import { getAppSkeleton } from '../../components/app-skeletons';

const TimerStopwatch = dynamic(() => import('../../apps/timer_stopwatch'), {
  ssr: false,
  loading: () => getAppSkeleton('timer_stopwatch', 'Timer & Stopwatch'),
});

export default function TimerStopwatchPage() {
  return <TimerStopwatch />;
}
