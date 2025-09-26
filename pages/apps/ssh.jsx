import createSuspenseAppPage from '../../utils/createSuspenseAppPage';

export default createSuspenseAppPage(() => import('../../apps/ssh'), {
  appName: 'SSH Command Builder',
});
