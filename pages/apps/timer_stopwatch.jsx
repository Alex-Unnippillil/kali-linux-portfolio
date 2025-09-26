import createSuspenseAppPage from '../../utils/createSuspenseAppPage';

export default createSuspenseAppPage(() => import('../../apps/timer_stopwatch'), {
  appName: 'Timer & Stopwatch',
});
