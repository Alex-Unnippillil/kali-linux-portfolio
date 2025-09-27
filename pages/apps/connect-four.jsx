import createSuspenseAppPage from '../../utils/createSuspenseAppPage';

export default createSuspenseAppPage(() => import('../../apps/connect-four'), {
  appName: 'Connect Four',
});
