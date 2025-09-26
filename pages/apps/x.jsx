import createSuspenseAppPage from '../../utils/createSuspenseAppPage';

export default createSuspenseAppPage(() => import('../../apps/x'), {
  appName: 'Project X',
});
