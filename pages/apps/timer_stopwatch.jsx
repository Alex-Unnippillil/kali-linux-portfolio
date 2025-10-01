import dynamic from 'next/dynamic';
import { withDeepLinkBoundary } from '../../utils/deeplink';

const TimerStopwatch = dynamic(() => import('../../apps/timer_stopwatch'), {
  ssr: false,
  loading: () => <p>Loading...</p>,
});

function TimerStopwatchPage() {
  return <TimerStopwatch />;
}

export default withDeepLinkBoundary('timer_stopwatch', TimerStopwatchPage);
