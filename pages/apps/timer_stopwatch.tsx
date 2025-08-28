import dynamic from 'next/dynamic';
import AppLoader from '../../components/AppLoader';

const TimerStopwatch = dynamic(() => import('../../apps/timer_stopwatch'), {
  ssr: false,
  loading: () => <AppLoader />,
});

export default function TimerStopwatchPage() {
  return <TimerStopwatch />;
}

