import createSuspenseAppPage from '../../utils/createSuspenseAppPage';

export default createSuspenseAppPage(() => import('../../apps/calculator'), {
  appName: 'Calculator',
});
