import dynamic from '@/utils/dynamic';

const TimerStopwatch = dynamic(() => import('@/apps/timer_stopwatch'), {
  ssr: false,
});

export default function TimerStopwatchPage() {
  return <TimerStopwatch />;
}

