import dynamic from 'next/dynamic';

const TimerStopwatch = dynamic(() => import('../../apps/timer_stopwatch'), {
  ssr: false,
  loading: () => <p>Loading...</p>,
});

export default function TimerStopwatchPage() {
  return <TimerStopwatch />;
}

