import createSuspenseAppPage from '../../utils/createSuspenseAppPage';

export default createSuspenseAppPage(() => import('../../apps/input-lab'), {
  appName: 'Input Lab',
});
